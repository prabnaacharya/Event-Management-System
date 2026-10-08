from flask import Blueprint, jsonify
from models import Category

categories_bp = Blueprint("categories", __name__, url_prefix="/api/categories")


@categories_bp.route("", methods=["GET"])
def list_categories():
    categories = Category.query.all()
    return jsonify([c.to_dict() for c in categories]), 200
