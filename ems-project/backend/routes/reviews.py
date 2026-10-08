from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from extensions import db
from models import Event, Review

reviews_bp = Blueprint("reviews", __name__, url_prefix="/api")

MIN_COMMENT = 3
MAX_COMMENT = 1000


def _summary(event_id):
    reviews = Review.query.filter_by(event_id=event_id).order_by(Review.created_at.desc()).all()
    count = len(reviews)
    avg = round(sum(r.rating for r in reviews) / count, 1) if count else 0
    breakdown = {str(n): sum(1 for r in reviews if r.rating == n) for n in range(5, 0, -1)}
    return {
        "reviews": [r.to_dict() for r in reviews],
        "average": avg,
        "count": count,
        "breakdown": breakdown,
    }


@reviews_bp.route("/events/<int:event_id>/reviews", methods=["GET"])
def list_reviews(event_id):
    Event.query.get_or_404(event_id)
    return jsonify(_summary(event_id)), 200


@reviews_bp.route("/events/<int:event_id>/reviews", methods=["POST"])
@jwt_required()
def add_review(event_id):
    event = Event.query.get_or_404(event_id)
    if event.status != "active":
        return jsonify({"message": "This event is not available for reviews."}), 400

    data = request.get_json() or {}

    # --- validation ---
    try:
        rating = int(data.get("rating"))
    except (TypeError, ValueError):
        return jsonify({"message": "Please select a rating from 1 to 5 stars."}), 400
    if rating < 1 or rating > 5:
        return jsonify({"message": "Rating must be between 1 and 5."}), 400

    comment = (data.get("comment") or "").strip()
    if len(comment) < MIN_COMMENT:
        return jsonify({"message": f"Comment must be at least {MIN_COMMENT} characters."}), 400
    if len(comment) > MAX_COMMENT:
        return jsonify({"message": f"Comment cannot be longer than {MAX_COMMENT} characters."}), 400

    user_id = int(get_jwt_identity())
    review = Review.query.filter_by(event_id=event_id, user_id=user_id).first()
    if review:  # one review per user per event -> posting again edits it
        review.rating = rating
        review.comment = comment
        status_code = 200
    else:
        review = Review(event_id=event_id, user_id=user_id, rating=rating, comment=comment)
        db.session.add(review)
        status_code = 201
    db.session.commit()
    return jsonify({"review": review.to_dict(), **_summary(event_id)}), status_code


@reviews_bp.route("/reviews/<int:review_id>", methods=["DELETE"])
@jwt_required()
def delete_review(review_id):
    review = Review.query.get_or_404(review_id)
    is_admin = get_jwt().get("role") == "admin"
    if review.user_id != int(get_jwt_identity()) and not is_admin:
        return jsonify({"message": "You can only delete your own review."}), 403
    event_id = review.event_id
    db.session.delete(review)
    db.session.commit()
    return jsonify(_summary(event_id)), 200
