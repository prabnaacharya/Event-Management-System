from functools import wraps
import re
from datetime import datetime
from datetime import date
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from extensions import db
from models import Event, User, Booking, Category, Review
from routes.payments import confirm_booking
admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")
def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"message": "Admin access required"}), 403
        return fn(*args, **kwargs)
    return wrapper
@admin_bp.route("/stats", methods=["GET"])
@admin_required
def stats():
    status_lc = db.func.lower(Booking.status)
    total_events = Event.query.filter(Event.status == "active").count()
    total_users = User.query.filter_by(role="user").count()
    confirmed_bookings = Booking.query.filter(status_lc == "confirmed").count()
    pending_list = Booking.query.filter(status_lc == "pending").order_by(Booking.created_at.desc()).all()
    total_revenue = db.session.query(db.func.coalesce(db.func.sum(Booking.total_amount), 0)).filter(status_lc == "confirmed").scalar()
    recent_bookings = Booking.query.order_by(Booking.created_at.desc()).limit(8).all()
    events = Event.query.filter(Event.status == "active").order_by(Event.id.desc()).all()

    return jsonify({
        "total_events": total_events,
        "total_bookings": Booking.query.count(),
        "confirmed_bookings": confirmed_bookings,
        "total_users": total_users,
        "pending_bookings": len(pending_list),
        "total_revenue": float(total_revenue),
        "pending_payments": [b.to_dict() for b in pending_list],
        "recent_bookings": [b.to_dict() for b in recent_bookings],
        "upcoming_events": [e.to_dict() for e in events],
        "total_reviews": Review.query.count(),
    }), 200


@admin_bp.route("/reviews", methods=["GET"])
@admin_required
def list_reviews():
    """All reviews/comments with the event title (admin can delete via DELETE /api/reviews/<id>)."""
    rows = Review.query.order_by(Review.created_at.desc()).all()
    out = []
    for r in rows:
        d = r.to_dict()
        d["event_title"] = r.event.title if r.event else None
        out.append(d)
    return jsonify(out), 200


TIME_RE = re.compile(r"^\s*(\d{1,2}):(\d{2})\s*(AM|PM)?\s*$", re.I)
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _norm_time(value):
    """Accepts '18:00' or '6:00 PM' and returns '6:00 PM' (None if invalid)."""
    m = TIME_RE.match(str(value or ""))
    if not m:
        return None
    h, mi, ap = int(m.group(1)), int(m.group(2)), (m.group(3) or "").upper()
    if mi > 59:
        return None
    if ap:
        if not 1 <= h <= 12:
            return None
    else:
        if h > 23:
            return None
        ap = "PM" if h >= 12 else "AM"
        h = h % 12 or 12
    return f"{h}:{mi:02d} {ap}"


def _validate_event(data, existing=None):
    """
    Returns (clean_dict, error_message). `existing` is the Event when editing.
    Rules: event date must be a FUTURE date (today is not allowed), title/venue
    required, price >= 0, tickets >= 1 (only for ticketed events), valid time / email.
    """
    merged = {}
    if existing is not None:
        merged = {
            "title": existing.title, "description": existing.description, "image_url": existing.image_url,
            "category_id": existing.category_id, "venue": existing.venue,
            "event_date": existing.event_date.isoformat(), "event_time": existing.event_time,
            "price": float(existing.price), "total_tickets": existing.total_tickets,
            "has_tickets": existing.has_tickets, "organizer_name": existing.organizer_name,
            "organizer_email": existing.organizer_email, "performers": existing.performers,
            "food_details": existing.food_details,
        }
    merged.update({k: v for k, v in data.items() if v is not None})
    clean = {}

    title = str(merged.get("title") or "").strip()
    if len(title) < 3 or len(title) > 150:
        return None, "Event title must be 3 to 150 characters."
    clean["title"] = title

    venue = str(merged.get("venue") or "").strip()
    if len(venue) < 3 or len(venue) > 150:
        return None, "Venue must be 3 to 150 characters."
    clean["venue"] = venue

    try:
        category_id = int(merged.get("category_id"))
    except (TypeError, ValueError):
        return None, "Please select a category."
    if not db.session.get(Category, category_id):
        return None, "Selected category does not exist."
    clean["category_id"] = category_id

    # --- date: must be tomorrow or later (today is NOT allowed) ---
    try:
        event_date = date.fromisoformat(str(merged.get("event_date") or ""))
    except ValueError:
        return None, "Please provide a valid event date (YYYY-MM-DD)."
    date_changed = existing is None or event_date != existing.event_date
    if date_changed and event_date <= date.today():
        return None, "Event date must be a future date. Today's or past dates are not allowed."
    clean["event_date"] = event_date

    event_time = _norm_time(merged.get("event_time"))
    if not event_time:
        return None, "Please provide a valid event time (e.g. 6:00 PM)."
    clean["event_time"] = event_time

    has_tickets = merged.get("has_tickets", True)
    if isinstance(has_tickets, str):
        has_tickets = has_tickets.lower() in ("1", "true", "yes", "on")
    clean["has_tickets"] = bool(has_tickets)
    if db.session.get(Category, category_id).name == "Weddings":
        clean["has_tickets"] = False  # wedding = invitation only, no tickets

    if clean["has_tickets"]:
        try:
            price = float(merged.get("price"))
        except (TypeError, ValueError):
            return None, "Please enter a valid ticket price."
        if price < 0 or price > 1000000:
            return None, "Ticket price must be between 0 and 10,00,000."
        try:
            total = int(merged.get("total_tickets"))
        except (TypeError, ValueError):
            return None, "Please enter the total number of tickets."
        if total < 1 or total > 100000:
            return None, "Total tickets must be between 1 and 100000."
        clean["price"], clean["total_tickets"] = price, total
    else:  # no-ticket event (e.g. wedding): no tickets; "price" = optional fixed amount per guest (0 = guest decides)
        try:
            price = float(merged.get("price") or 0)
        except (TypeError, ValueError):
            return None, "Please enter a valid amount."
        if price < 0 or price > 1000000:
            return None, "Amount must be between 0 and 10,00,000."
        clean["price"], clean["total_tickets"] = price, 0

    email = str(merged.get("organizer_email") or "").strip()
    if email and not EMAIL_RE.match(email):
        return None, "Organizer email is not valid."
    clean["organizer_email"] = email

    clean["organizer_name"] = str(merged.get("organizer_name") or "Event Organizer").strip()[:120] or "Event Organizer"

    for field, label, limit in (("description", "Description", 5000),
                                ("performers", "Who is coming", 2000),
                                ("food_details", "Food details", 2000)):
        text = str(merged.get(field) or "").strip()
        if len(text) > limit:
            return None, f"{label} is too long (max {limit} characters)."
        clean[field] = text
    clean["image_url"] = str(merged.get("image_url") or "").strip()[:500]
    return clean, None


@admin_bp.route("/events", methods=["POST"])
@admin_required
def create_event():
    clean, err = _validate_event(request.get_json() or {})
    if err:
        return jsonify({"message": err}), 400
    event = Event(**clean, available_tickets=clean["total_tickets"])
    db.session.add(event)
    db.session.commit()
    return jsonify(event.to_dict(detailed=True)), 201


@admin_bp.route("/events/<int:event_id>", methods=["PUT"])
@admin_required
def update_event(event_id):
    event = Event.query.get_or_404(event_id)
    data = request.get_json() or {}
    clean, err = _validate_event(data, existing=event)
    if err:
        return jsonify({"message": err}), 400
    sold = max(0, (event.total_tickets or 0) - (event.available_tickets or 0))
    if clean["has_tickets"] and clean["total_tickets"] < sold:
        return jsonify({"message": f"Total tickets cannot be less than the {sold} already sold/reserved."}), 400
    for k, v in clean.items():
        setattr(event, k, v)
    event.available_tickets = max(0, clean["total_tickets"] - sold) if clean["has_tickets"] else 0
    if data.get("status") in ("active", "deleted"):
        event.status = data["status"]
    db.session.commit()
    return jsonify(event.to_dict(detailed=True)), 200


@admin_bp.route("/events/<int:event_id>", methods=["DELETE"])
@admin_required
def delete_event(event_id):
    event = Event.query.get_or_404(event_id)
    # Bookings / payment records must not be lost: if the event already has
    # bookings it is hidden (status = "deleted"); otherwise it is removed fully.
    if Booking.query.filter_by(event_id=event.id).count() > 0:
        event.status = "deleted"
    else:
        db.session.delete(event)
    db.session.commit()
    return jsonify({"message": "Event deleted"}), 200


@admin_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200


@admin_bp.route("/bookings", methods=["GET"])
@admin_required
def list_bookings():
    bookings = Booking.query.order_by(Booking.created_at.desc()).all()
    counts = {}
    for b in bookings:
        if b.proof_hash:
            counts[b.proof_hash] = counts.get(b.proof_hash, 0) + 1
    out = []
    for b in bookings:
        d = b.to_dict()
        d["buyer_email"] = b.buyer_email
        d["buyer_phone"] = b.buyer_phone
        d["duplicate_proof"] = bool(b.proof_hash and counts.get(b.proof_hash, 0) > 1)
        d["amount_mismatch"] = bool(b.paid_amount is not None and abs(float(b.paid_amount) - float(b.total_amount)) > 0.01)
        out.append(d)
    return jsonify(out), 200

@admin_bp.route("/bookings/<int:booking_id>/status", methods=["PUT"])
@admin_required
def update_booking_status(booking_id):
    """Admin approves / rejects a QR-screenshot or Cash-on-Delivery booking."""
    booking = Booking.query.get_or_404(booking_id)
    new_status = (request.get_json() or {}).get("status", "").lower()
    if new_status not in ("confirmed", "failed", "cancelled"):
        return jsonify({"message": "Status must be confirmed, failed or cancelled"}), 400

    if new_status == "confirmed":
        if booking.paid_amount is not None and abs(float(booking.paid_amount) - float(booking.total_amount)) > 0.01:
            return jsonify({"message": "Paid amount does not match the total. Reject this booking."}), 400
        if booking.proof_hash and Booking.query.filter(
            Booking.proof_hash == booking.proof_hash, Booking.id != booking.id,
            db.func.lower(Booking.status) == "confirmed").first():
            return jsonify({"message": "This screenshot was already used for another confirmed booking. Reject it."}), 400
        if not confirm_booking(booking):
            return jsonify({"message": "Not enough tickets left to confirm this booking"}), 400
    else:
        if (booking.status or "").lower() == "confirmed" and (booking.kind or "ticket") == "ticket":
            event = Event.query.get(booking.event_id)
            if event:
                event.available_tickets += booking.quantity
        booking.status = new_status
        db.session.commit()
    return jsonify(booking.to_dict()), 200


# ---------------------------------------------------------------- gate check-in
CODE_RE = re.compile(r"EMS-(\d{1,8})-([A-Z0-9]{4,12})")


def _booking_from_code(raw):
    m = CODE_RE.search((raw or "").upper())
    if not m:
        return None
    booking = db.session.get(Booking, int(m.group(1)))
    if not booking or booking.make_ticket_code() != f"EMS-{booking.id:05d}-{m.group(2)}":
        return None
    return booking


def _gate_view(b):
    """Everything the gate person needs + whether this ticket may enter now."""
    ev = b.event
    status = (b.status or "").lower()
    remaining = max(0, (b.quantity or 0) - (b.checked_in_count or 0))
    reason = None
    if status != "confirmed":
        reason = f"Payment is not confirmed (status: {status})."
    elif ev is None or ev.status != "active":
        reason = "This event has been cancelled."
    elif remaining == 0:
        when = b.checked_in_at.strftime("%I:%M %p") if b.checked_in_at else ""
        reason = f"Already checked in{(' at ' + when) if when else ''}. This QR was used."
    return {
        "valid": reason is None,
        "reason": reason,
        "date_ok": bool(ev and ev.event_date == date.today()),
        "today": date.today().isoformat(),
        "booking": {
            "id": b.id, "ticket_code": b.make_ticket_code(), "kind": b.kind or "ticket",
            "holder": b.buyer_name or (b.user.full_name if b.user else ""),
            "phone": b.buyer_phone, "event": ev.title if ev else "", "event_date": ev.event_date.isoformat() if ev else None,
            "event_time": ev.event_time if ev else "", "venue": ev.venue if ev else "",
            "quantity": b.quantity, "checked_in_count": b.checked_in_count or 0, "remaining": remaining,
            "status": status,
        },
    }


@admin_bp.route("/checkin/lookup", methods=["POST"])
@admin_required
def checkin_lookup():
    b = _booking_from_code((request.get_json() or {}).get("code"))
    if not b:
        return jsonify({"valid": False, "reason": "Invalid or fake QR code. No such ticket.", "booking": None}), 200
    return jsonify(_gate_view(b)), 200


@admin_bp.route("/checkin", methods=["POST"])
@admin_required
def checkin_admit():
    data = request.get_json() or {}
    b = _booking_from_code(data.get("code"))
    if not b:
        return jsonify({"message": "Invalid or fake QR code."}), 400
    b = Booking.query.filter_by(id=b.id).with_for_update().first()
    view = _gate_view(b)
    if not view["valid"]:
        return jsonify({"message": view["reason"]}), 400
    if not view["date_ok"] and not data.get("force"):
        return jsonify({"message": f"This ticket is for {view['booking']['event_date']}, not today ({view['today']}).",
                        "needs_force": True}), 409
    remaining = view["booking"]["remaining"]
    try:
        count = int(data.get("count") or remaining)
    except (TypeError, ValueError):
        return jsonify({"message": "Invalid number of people."}), 400
    if count < 1 or count > remaining:
        return jsonify({"message": f"You can admit between 1 and {remaining} people."}), 400
    b.checked_in_count = (b.checked_in_count or 0) + count
    b.checked_in_at = datetime.now()
    db.session.commit()
    out = _gate_view(b)
    out["admitted"] = count
    return jsonify(out), 200
