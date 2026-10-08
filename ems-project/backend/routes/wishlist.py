from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import Event, Wishlist

wishlist_bp = Blueprint("wishlist", __name__, url_prefix="/api/wishlist")


def _payload(user_id):
    rows = (Wishlist.query.filter_by(user_id=user_id)
            .order_by(Wishlist.created_at.desc()).all())
    rows = [r for r in rows if r.event and r.event.status == "active"]
    return {"ids": [r.event_id for r in rows], "events": [r.event.to_dict() for r in rows]}


@wishlist_bp.route("", methods=["GET"])
@jwt_required()
def get_wishlist():
    return jsonify(_payload(int(get_jwt_identity()))), 200


@wishlist_bp.route("/<int:event_id>", methods=["POST"])
@jwt_required()
def add_to_wishlist(event_id):
    user_id = int(get_jwt_identity())
    event = Event.query.get_or_404(event_id)
    if event.status != "active":
        return jsonify({"message": "This event is not available."}), 400
    if not Wishlist.query.filter_by(user_id=user_id, event_id=event_id).first():
        db.session.add(Wishlist(user_id=user_id, event_id=event_id))
        db.session.commit()
    return jsonify(_payload(user_id)), 201


@wishlist_bp.route("/<int:event_id>", methods=["DELETE"])
@jwt_required()
def remove_from_wishlist(event_id):
    user_id = int(get_jwt_identity())
    row = Wishlist.query.filter_by(user_id=user_id, event_id=event_id).first()
    if row:
        db.session.delete(row)
        db.session.commit()
    return jsonify(_payload(user_id)), 200
