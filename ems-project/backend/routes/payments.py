import base64
import hashlib
import hmac
import json
import os
import re
import secrets
from datetime import datetime, date
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv
from flask import Blueprint, jsonify, redirect, request, current_app, send_from_directory
from werkzeug.utils import secure_filename
from flask_jwt_extended import get_jwt_identity, jwt_required
from extensions import db
from models import Booking, Event

load_dotenv()
payments_bp = Blueprint("payments", __name__, url_prefix="/api/payments")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
ESEWA_PRODUCT_CODE = os.getenv("ESEWA_PRODUCT_CODE", "EPAYTEST")
ESEWA_SECRET_KEY = os.getenv("ESEWA_SECRET_KEY", "8gBm/:&EnhH.1/q")
ESEWA_FORM_URL = os.getenv("ESEWA_FORM_URL", "https://rc-epay.esewa.com.np/api/epay/main/v2/form")
ESEWA_STATUS_URL = os.getenv("ESEWA_STATUS_URL", "https://rc.esewa.com.np/api/epay/transaction/status/")

FONEPAY_PID = os.getenv("FONEPAY_PID", "fonepay123")
FONEPAY_SECRET_KEY = os.getenv("FONEPAY_SECRET_KEY", "")
FONEPAY_DEMO = not FONEPAY_SECRET_KEY
_FONEPAY_DEMO_SECRET = "ems-local-demo-secret"
FONEPAY_URL = (
    f"{BACKEND_URL}/api/payments/fonepay/sandbox"
    if FONEPAY_DEMO
    else os.getenv("FONEPAY_URL", "https://dev-clientapi.fonepay.com/api/merchantRequest")
)

# esewa / fonepay  -> online gateway redirect (kept, optional)
# esewa_qr / fonepay_qr -> scan QR, upload screenshot, admin verifies
# cod -> cash on delivery, admin confirms
METHODS = ("esewa", "fonepay", "esewa_qr", "fonepay_qr", "cod")
MANUAL_METHODS = ("esewa_qr", "fonepay_qr", "cod")
PROOF_METHODS = ("esewa_qr", "fonepay_qr")
ALLOWED_IMAGE_EXT = {"png", "jpg", "jpeg", "webp", "gif"}


def _amt(value) -> str:
    v = float(value)
    return str(int(v)) if v.is_integer() else str(v)


def _esewa_sign(message: str) -> str:
    digest = hmac.new(ESEWA_SECRET_KEY.encode(), message.encode(), hashlib.sha256).digest()
    return base64.b64encode(digest).decode()


def _fonepay_sign(message: str) -> str:
    key = FONEPAY_SECRET_KEY or _FONEPAY_DEMO_SECRET
    return hmac.new(key.encode(), message.encode(), hashlib.sha512).hexdigest()


def _current_user_id() -> int:
    identity = get_jwt_identity()
    if isinstance(identity, dict):
        identity = identity.get("id")
    return int(identity)


def _result(status: str, event_id=None):
    url = f"{FRONTEND_URL}/payment/result?status={status}"
    if event_id:
        url += f"&event={event_id}"
    return redirect(url, code=303)


def _status(booking) -> str:
    return (booking.status or "").lower()


def confirm_booking(booking, ref_id=None) -> bool:
    if _status(booking) == "confirmed":
        return True
    if (booking.kind or "ticket") == "rsvp":  # RSVP / gift for wedding-type events: no tickets involved
        booking.status = "confirmed"
        if ref_id:
            booking.ref_id = ref_id
        db.session.commit()
        return True
    event = Event.query.filter_by(id=booking.event_id).with_for_update().first()
    if not event or (event.available_tickets or 0) < booking.quantity:
        booking.status = "failed"
        db.session.commit()
        return False
    event.available_tickets -= booking.quantity
    booking.status = "confirmed"
    if ref_id:
        booking.ref_id = ref_id
    db.session.commit()
    return True


@payments_bp.route("/rsvp", methods=["POST"])
@jwt_required()
def rsvp():
    """
    RSVP for events that do not sell tickets (e.g. a wedding).
    - guests: 1..10
    - amount: fixed (event.price x guests) if the admin set one, otherwise the guest decides (0 = RSVP only)
    - amount > 0 -> pay by eSewa/Fonepay QR with screenshot + transaction ID (admin approves)
    """
    data = request.form
    proof_file = request.files.get("payment_proof")
    try:
        event_id = int(data.get("event_id"))
        guests = int(data.get("quantity", 1))
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid event or number of guests"}), 400
    if not 1 <= guests <= 10:
        return jsonify({"message": "Guests must be between 1 and 10"}), 400
    if not (data.get("buyer_name") or "").strip() or not (data.get("buyer_email") or "").strip():
        return jsonify({"message": "Name and email are required"}), 400
    phone = re.sub(r"\D", "", data.get("buyer_phone") or "")
    if phone.startswith("977") and len(phone) == 13:
        phone = phone[3:]
    if not re.fullmatch(r"9[678]\d{8}", phone):
        return jsonify({"message": "Please enter a valid 10-digit mobile number (e.g. 98XXXXXXXX)"}), 400

    event = Event.query.get(event_id)
    if not event or event.status != "active":
        return jsonify({"message": "Event not found"}), 404
    if event.ticketed():
        return jsonify({"message": "This event sells tickets. Please use the ticket checkout."}), 400
    if event.event_date <= date.today():
        return jsonify({"message": "RSVP is closed for this event"}), 400

    user_id = _current_user_id()
    if Booking.query.filter(Booking.user_id == user_id, Booking.event_id == event.id, Booking.kind == "rsvp",
                            db.func.lower(Booking.status).in_(["pending", "confirmed"])).first():
        return jsonify({"message": "You have already RSVP'd for this event"}), 400

    fixed = float(event.price or 0)
    if fixed > 0:
        amount = round(fixed * guests, 2)
    else:
        try:
            amount = round(float(data.get("amount") or 0), 2)
        except ValueError:
            return jsonify({"message": "Invalid amount"}), 400
        if amount < 0 or amount > 1000000:
            return jsonify({"message": "Amount must be between 0 and 10,00,000"}), 400

    method, proof_filename, proof_hash, payment_ref, paid_amount = "none", None, None, None, None
    if amount > 0:
        method = data.get("method")
        if method not in PROOF_METHODS:
            return jsonify({"message": "Please pay with eSewa or Fonepay QR"}), 400
        try:
            paid_amount = round(float(data.get("paid_amount")), 2)
        except (TypeError, ValueError):
            return jsonify({"message": "Please enter the amount you paid."}), 400
        if paid_amount != amount:
            return jsonify({"message": f"Payment amount must be exactly Rs. {amount:g}. You entered Rs. {paid_amount:g}."}), 400
        payment_ref = (data.get("payment_ref") or "").strip().upper()
        if not re.fullmatch(r"[A-Z0-9\-_]{6,40}", payment_ref):
            return jsonify({"message": "Please enter a valid transaction / reference ID (6-40 letters or digits)."}), 400
        if Booking.query.filter(db.func.upper(Booking.payment_ref) == payment_ref).first():
            return jsonify({"message": "This transaction ID has already been used for another booking."}), 400
        if not (proof_file and proof_file.filename):
            return jsonify({"message": "Please upload your payment screenshot"}), 400
        ext = proof_file.filename.rsplit(".", 1)[-1].lower() if "." in proof_file.filename else ""
        if ext not in ALLOWED_IMAGE_EXT:
            return jsonify({"message": "Screenshot must be an image (png, jpg, jpeg, webp)"}), 400
        raw = proof_file.read()
        proof_file.seek(0)
        if len(raw) > 5 * 1024 * 1024:
            return jsonify({"message": "Screenshot is too large (max 5 MB)"}), 400
        is_img = raw[:3] == b"\xff\xd8\xff" or raw[:4] == b"GIF8" or raw[:8] == b"\x89PNG\r\n\x1a\n" or (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP")
        if not is_img:
            return jsonify({"message": "That file is not a valid image. Please upload a real screenshot"}), 400
        proof_hash = hashlib.sha256(raw).hexdigest()
        if Booking.query.filter(Booking.proof_hash == proof_hash).first():
            return jsonify({"message": "This screenshot has already been used for another booking. Please upload your own new payment screenshot."}), 400
        proof_filename = f"{secrets.token_hex(8)}_{secure_filename(proof_file.filename)}"
        upload_folder = current_app.config["UPLOAD_FOLDER"]
        os.makedirs(upload_folder, exist_ok=True)
        proof_file.save(os.path.join(upload_folder, proof_filename))

    booking = Booking(
        user_id=user_id, event_id=event.id, kind="rsvp", quantity=guests, total_amount=amount,
        status="confirmed" if amount == 0 else "pending",  # no money involved -> confirmed straight away
        payment_method=method, transaction_uuid="RS" + secrets.token_hex(6),
        payment_proof=proof_filename, proof_hash=proof_hash, paid_amount=paid_amount, payment_ref=payment_ref,
        buyer_name=(data.get("buyer_name") or "").strip(), buyer_email=(data.get("buyer_email") or "").strip(), buyer_phone=phone,
    )
    db.session.add(booking)
    db.session.commit()
    return jsonify({"booking_id": booking.id, "status": booking.status,
                    "message": "RSVP confirmed!" if amount == 0 else "RSVP submitted. We will confirm once your payment is verified."}), 201


@payments_bp.route("/checkout", methods=["POST"])
@jwt_required()
def checkout():
    data = request.form
    proof_file = request.files.get("payment_proof")

    try:
        event_id = int(data.get("event_id"))
        quantity = int(data.get("quantity", 1))
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid event or quantity"}), 400

    method = data.get("method")
    if method not in METHODS:
        return jsonify({"message": "Invalid payment method"}), 400
    if not 1 <= quantity <= 10:
        return jsonify({"message": "Quantity must be between 1 and 10"}), 400
    if not (data.get("buyer_name") or "").strip() or not (data.get("buyer_email") or "").strip():
        return jsonify({"message": "Buyer name and email are required"}), 400

    phone = re.sub(r"\D", "", data.get("buyer_phone") or "")
    if phone.startswith("977") and len(phone) == 13:
        phone = phone[3:]
    if not re.fullmatch(r"9[678]\d{8}", phone):
        return jsonify({"message": "Please enter a valid 10-digit mobile number (e.g. 98XXXXXXXX)"}), 400

    # --- QR payments: the user must declare the FULL amount paid + the transaction ID ---
    paid_amount = None
    payment_ref = None
    if method in PROOF_METHODS:
        ev = Event.query.get(event_id)
        if ev:
            expected = round(float(ev.price) * quantity, 2)
            try:
                paid_amount = round(float(data.get("paid_amount")), 2)
            except (TypeError, ValueError):
                return jsonify({"message": "Please enter the amount you paid."}), 400
            if paid_amount != expected:
                return jsonify({"message": f"Payment amount must be exactly Rs. {expected:g}. You entered Rs. {paid_amount:g}. Partial payment is not accepted."}), 400
        payment_ref = (data.get("payment_ref") or "").strip().upper()
        if not re.fullmatch(r"[A-Z0-9\-_]{6,40}", payment_ref):
            return jsonify({"message": "Please enter a valid transaction / reference ID (6-40 letters or digits) from your payment receipt."}), 400
        if Booking.query.filter(db.func.upper(Booking.payment_ref) == payment_ref).first():
            return jsonify({"message": "This transaction ID has already been used for another booking."}), 400

    # --- Cash on delivery: delivery address is required (like any online order) ---
    delivery_address = delivery_city = delivery_landmark = None
    if method == "cod":
        delivery_address = (data.get("delivery_address") or "").strip()
        delivery_city = (data.get("delivery_city") or "").strip()
        delivery_landmark = (data.get("delivery_landmark") or "").strip()
        if len(delivery_address) < 5 or len(delivery_address) > 255:
            return jsonify({"message": "Please enter your full delivery address (street / tole / house no.)."}), 400
        if len(delivery_city) < 2 or len(delivery_city) > 80:
            return jsonify({"message": "Please enter your city / district."}), 400
        delivery_landmark = delivery_landmark[:120]

    has_file = bool(proof_file and proof_file.filename)
    if method in PROOF_METHODS and not has_file:
        return jsonify({"message": "Please upload your payment screenshot"}), 400
    proof_hash = None
    if has_file:
        ext = proof_file.filename.rsplit(".", 1)[-1].lower() if "." in proof_file.filename else ""
        if ext not in ALLOWED_IMAGE_EXT:
            return jsonify({"message": "Screenshot must be an image (png, jpg, jpeg, webp)"}), 400
        raw = proof_file.read()
        proof_file.seek(0)
        if len(raw) > 5 * 1024 * 1024:
            return jsonify({"message": "Screenshot is too large (max 5 MB)"}), 400
        is_img = raw[:3] == b"\xff\xd8\xff" or raw[:4] == b"GIF8" or raw[:8] == b"\x89PNG\r\n\x1a\n" or (raw[:4] == b"RIFF" and raw[8:12] == b"WEBP")
        if not is_img:
            return jsonify({"message": "That file is not a valid image. Please upload a real screenshot"}), 400
        proof_hash = hashlib.sha256(raw).hexdigest()
        # the same screenshot can never be used twice (even if the earlier booking was rejected)
        if Booking.query.filter(Booking.proof_hash == proof_hash).first():
            return jsonify({"message": "This screenshot has already been used for another booking. Please upload your own new payment screenshot."}), 400

    event = Event.query.get(event_id)
    if not event:
        return jsonify({"message": "Event not found"}), 404
    if event.status != "active":
        return jsonify({"message": "This event is no longer available"}), 400
    if not event.ticketed():
        return jsonify({"message": "This event does not sell tickets"}), 400
    if event.event_date <= date.today():
        return jsonify({"message": "Booking is closed for this event"}), 400
    if (event.available_tickets or 0) < quantity:
        return jsonify({"message": "Not enough tickets available"}), 400

    user_id = _current_user_id()
    existing = Booking.query.filter(
        Booking.user_id == user_id,
        Booking.event_id == event.id,
        db.func.lower(Booking.status).in_(["pending", "confirmed"]),
    ).all()
    for b in existing:
        if _status(b) == "confirmed" or b.payment_method in MANUAL_METHODS:
            return jsonify({"message": "You already have a booking for this event"}), 400
        b.status = "failed"

    # Save the screenshot only after every check has passed
    proof_filename = None
    if has_file:
        proof_filename = f"{secrets.token_hex(8)}_{secure_filename(proof_file.filename)}"
        upload_folder = current_app.config["UPLOAD_FOLDER"]
        os.makedirs(upload_folder, exist_ok=True)
        proof_file.save(os.path.join(upload_folder, proof_filename))

    total = float(event.price) * quantity
    ref = "EV" + secrets.token_hex(6)

    booking = Booking(
        user_id=user_id,
        event_id=event.id,
        quantity=quantity,
        total_amount=total,
        status="pending",
        payment_method=method,
        transaction_uuid=ref,
        payment_proof=proof_filename,
        proof_hash=proof_hash,
        paid_amount=paid_amount,
        payment_ref=payment_ref,
        delivery_address=delivery_address,
        delivery_city=delivery_city,
        delivery_landmark=delivery_landmark,
        buyer_name=(data.get("buyer_name") or "").strip(),
        buyer_email=(data.get("buyer_email") or "").strip(),
        buyer_phone=phone,
    )
    db.session.add(booking)
    db.session.commit()

    if method in MANUAL_METHODS:
        return jsonify({"method": method, "booking_id": booking.id, "message": "Booking submitted successfully!"}), 201

    if method == "esewa":
        total_s = _amt(total)
        message = f"total_amount={total_s},transaction_uuid={ref},product_code={ESEWA_PRODUCT_CODE}"
        return jsonify({
            "method": "esewa",
            "url": ESEWA_FORM_URL,
            "fields": {
                "amount": total_s,
                "tax_amount": "0",
                "total_amount": total_s,
                "transaction_uuid": ref,
                "product_code": ESEWA_PRODUCT_CODE,
                "product_service_charge": "0",
                "product_delivery_charge": "0",
                "success_url": f"{BACKEND_URL}/api/payments/esewa/success",
                "failure_url": f"{BACKEND_URL}/api/payments/esewa/failure/{ref}",
                "signed_field_names": "total_amount,transaction_uuid,product_code",
                "signature": _esewa_sign(message),
            },
        }), 201

    fields = {
        "PID": FONEPAY_PID,
        "MD": "P",
        "PRN": ref,
        "AMT": _amt(total),
        "CRN": "NPR",
        "DT": datetime.now().strftime("%m/%d/%Y"),
        "R1": "Event ticket",
        "R2": "N/A",
        "RU": f"{BACKEND_URL}/api/payments/fonepay/return",
    }
    order = ["PID", "MD", "PRN", "AMT", "CRN", "DT", "R1", "R2", "RU"]
    fields["DV"] = _fonepay_sign(",".join(fields[k] for k in order))
    return jsonify({"method": "fonepay", "url": FONEPAY_URL, "fields": fields}), 201


@payments_bp.route("/proof/<path:filename>", methods=["GET"])
def payment_proof(filename):
    """Serves uploaded payment screenshots so the admin can view them."""
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)


@payments_bp.route("/esewa/success", methods=["GET"])
def esewa_success():
    try:
        payload = json.loads(base64.b64decode(request.args.get("data", "")))
        names = payload["signed_field_names"].split(",")
        message = ",".join(f"{n}={payload[n]}" for n in names)
    except Exception:
        return _result("failed")

    if not hmac.compare_digest(_esewa_sign(message), str(payload.get("signature", ""))):
        return _result("failed")

    booking = Booking.query.filter_by(transaction_uuid=payload.get("transaction_uuid")).first()
    if not booking:
        return _result("failed")

    try:
        paid = float(str(payload.get("total_amount", "0")).replace(",", ""))
    except ValueError:
        return _result("failed", booking.event_id)
    if paid != float(booking.total_amount):
        return _result("failed", booking.event_id)

    try:
        info = requests.get(
            ESEWA_STATUS_URL,
            params={
                "product_code": ESEWA_PRODUCT_CODE,
                "total_amount": _amt(booking.total_amount),
                "transaction_uuid": booking.transaction_uuid,
            },
            timeout=15,
        ).json()
    except Exception:
        return _result("pending", booking.event_id)

    if info.get("status") == "COMPLETE" and confirm_booking(booking, info.get("ref_id")):
        return _result("success", booking.event_id)

    booking.status = "failed"
    db.session.commit()
    return _result("failed", booking.event_id)


@payments_bp.route("/esewa/failure/<ref>", methods=["GET"])
def esewa_failure(ref):
    booking = Booking.query.filter_by(transaction_uuid=ref).first()
    if booking and _status(booking) == "pending":
        booking.status = "failed"
        db.session.commit()
    return _result("failed", booking.event_id if booking else None)


@payments_bp.route("/fonepay/return", methods=["GET"])
def fonepay_return():
    q = request.args
    order = ["PRN", "PID", "PS", "RC", "UID", "BC", "INI", "P_AMT", "R_AMT"]
    message = ",".join(q.get(k, "") for k in order)

    booking = Booking.query.filter_by(transaction_uuid=q.get("PRN")).first()
    if not booking:
        return _result("failed")

    valid_sig = hmac.compare_digest(_fonepay_sign(message), (q.get("DV") or "").lower())
    try:
        amount_ok = float(q.get("P_AMT", "0")) == float(booking.total_amount)
    except ValueError:
        amount_ok = False

    ok = (
        valid_sig
        and amount_ok
        and q.get("PID") == FONEPAY_PID
        and q.get("PS", "").lower() == "true"
        and q.get("RC", "").lower() == "successful"
    )
    if ok and confirm_booking(booking, q.get("UID")):
        return _result("success", booking.event_id)

    booking.status = "failed"
    db.session.commit()
    return _result("failed", booking.event_id)


@payments_bp.route("/fonepay/sandbox", methods=["GET"])
def fonepay_sandbox():
    from markupsafe import escape

    if not FONEPAY_DEMO:
        return "Sandbox is disabled when real Fonepay keys are set.", 404

    q = request.args
    order = ["PID", "MD", "PRN", "AMT", "CRN", "DT", "R1", "R2", "RU"]
    message = ",".join(q.get(k, "") for k in order)
    if not hmac.compare_digest(_fonepay_sign(message), (q.get("DV") or "").lower()):
        return "Invalid request signature.", 400

    prn, amt = q.get("PRN", ""), q.get("AMT", "0")

    def link(ok: bool) -> str:
        params = {
            "PRN": prn, "PID": FONEPAY_PID,
            "PS": "true" if ok else "false",
            "RC": "successful" if ok else "cancelled",
            "UID": "DEMO" + secrets.token_hex(4), "BC": "DEMOBANK", "INI": "DEMO",
            "P_AMT": amt, "R_AMT": amt if ok else "0",
        }
        keys = ["PRN", "PID", "PS", "RC", "UID", "BC", "INI", "P_AMT", "R_AMT"]
        params["DV"] = _fonepay_sign(",".join(params[k] for k in keys))
        return f"{BACKEND_URL}/api/payments/fonepay/return?" + urlencode(params)

    html = f"""<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fonepay (Demo)</title>
<body style="font-family:system-ui,sans-serif;background:#f3f4f6;margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center">
<div style="background:#fff;border-radius:14px;padding:28px;max-width:360px;width:90%;box-shadow:0 4px 20px #0001;text-align:center">
<div style="background:#fff3cd;color:#664d03;font-size:12px;border-radius:8px;padding:6px 10px;margin-bottom:16px">
DEMO SANDBOX - this is not the real Fonepay</div>
<h2 style="margin:0 0 4px;color:#d9232d">Fonepay</h2>
<p style="color:#6b7280;margin:0 0 18px">Pay to EMS Event Management</p>
<p style="font-size:30px;font-weight:700;margin:0">Rs. {escape(amt)}</p>
<p style="color:#9ca3af;font-size:12px">Ref: {escape(prn)}</p>
<a href="{escape(link(True))}" style="display:block;background:#d9232d;color:#fff;text-decoration:none;padding:12px;border-radius:10px;margin-top:20px;font-weight:600">Pay now</a>
<a href="{escape(link(False))}" style="display:block;color:#6b7280;text-decoration:none;padding:12px;margin-top:6px">Cancel</a>
</div></body>"""
    return html