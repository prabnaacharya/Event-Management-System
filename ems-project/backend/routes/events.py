from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from models import Event, Category
 
events_bp = Blueprint("events", __name__, url_prefix="/api/events")
 
 
@events_bp.route("", methods=["GET"])
def list_events():
    """
    Supports:
      /api/events?search=rock          -> search by event title (and venue)
      /api/events?category=Music
      /api/events?date_from=2024-05-01&date_to=2024-06-01
      /api/events?sort=date_asc|date_desc|newest   (default: soonest first)
      /api/events?page=1&per_page=4
    """
    query = Event.query.filter(Event.status == "active")
 
    search = request.args.get("search", "").strip()
    if search:
        like = f"%{search}%"
        query = query.join(Category, isouter=True).filter(
            or_(Event.title.ilike(like), Event.venue.ilike(like))
        )
 
    category = request.args.get("category", "").strip()
    if category and category.lower() != "all categories":
        query = query.join(Category, isouter=True).filter(Category.name == category)
 
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    if date_from:
        query = query.filter(Event.event_date >= date_from)
    if date_to:
        query = query.filter(Event.event_date <= date_to)
    sort = request.args.get("sort", "date_asc")
    if sort == "date_desc":
        query = query.order_by(Event.event_date.desc(), Event.id.desc())
    elif sort == "newest":
        query = query.order_by(Event.id.desc())
    else:  # date_asc: soonest first
        query = query.order_by(Event.event_date.asc(), Event.id.asc())
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 4, type=int)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "events": [e.to_dict() for e in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
    }), 200
@events_bp.route("/featured", methods=["GET"])
def featured_events():
    events = Event.query.filter(Event.status == "active").order_by(
        Event.id.desc()
    ).limit(4).all()
    return jsonify([e.to_dict() for e in events]), 200
@events_bp.route("/<int:event_id>", methods=["GET"])
def get_event(event_id):
    event = Event.query.get_or_404(event_id)
    return jsonify(event.to_dict(detailed=True)), 200
 



