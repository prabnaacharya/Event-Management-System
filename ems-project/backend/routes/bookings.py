from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Booking, Review

bookings_bp = Blueprint("bookings", __name__, url_prefix="/api/bookings")


# NOTE: bookings are created only through POST /api/payments/checkout
# (so every booking goes through a payment method).
@bookings_bp.route("/my", methods=["GET"])
@jwt_required()
def my_bookings():
    user_id = int(get_jwt_identity())
    bookings = Booking.query.filter_by(user_id=user_id).order_by(
        Booking.created_at.desc()
    ).all()
    my_reviews = {r.event_id: r for r in Review.query.filter_by(user_id=user_id).all()}
    out = []
    for b in bookings:
        d = b.to_dict()
        r = my_reviews.get(b.event_id)
        d["my_review"] = r.to_dict() if r else None
        out.append(d)
    return jsonify(out), 200
