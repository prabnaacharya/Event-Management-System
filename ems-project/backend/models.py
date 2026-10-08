import hashlib
from datetime import datetime
import bcrypt
from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20))
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="user")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, raw):
        self.password_hash = bcrypt.hashpw(raw.encode(), bcrypt.gensalt()).decode()

    def check_password(self, raw):
        try:
            return bcrypt.checkpw(raw.encode(), self.password_hash.encode())
        except ValueError:
            return False

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "created_at": self.created_at.strftime("%Y-%m-%d") if self.created_at else None,
        }


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False, unique=True)
    icon = db.Column(db.String(50), default="Sparkles")

    def to_dict(self):
        count = Event.query.filter_by(category_id=self.id, status="active").count()
        return {"id": self.id, "name": self.name, "icon": self.icon, "event_count": count}


class Event(db.Model):
    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(500))
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)
    venue = db.Column(db.String(150), nullable=False)
    event_date = db.Column(db.Date, nullable=False)
    event_time = db.Column(db.String(20), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    total_tickets = db.Column(db.Integer, nullable=False, default=100)
    available_tickets = db.Column(db.Integer, nullable=False, default=100)
    organizer_name = db.Column(db.String(120), default="Event Organizer")
    organizer_email = db.Column(db.String(120))
    has_tickets = db.Column(db.Boolean, nullable=False, default=True)  # False = info-only event (e.g. wedding)
    performers = db.Column(db.Text)   # who is coming (artists / speakers / teams) - one per line
    food_details = db.Column(db.Text)  # food & drinks available - one per line
    status = db.Column(db.String(20), default="active")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    category = db.relationship("Category", backref="events")

    def ticketed(self):
        """Weddings / info-only events never sell tickets (so never show Sold out / Book now)."""
        if self.category and self.category.name == "Weddings":
            return False
        return bool(self.has_tickets) if self.has_tickets is not None else True

    def rating_summary(self):
        row = db.session.query(
            db.func.coalesce(db.func.avg(Review.rating), 0),
            db.func.count(Review.id),
        ).filter(Review.event_id == self.id).one()
        return round(float(row[0]), 1), int(row[1])

    def to_dict(self, detailed=False):
        avg_rating, review_count = self.rating_summary()
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "image_url": self.image_url,
            "category_id": self.category_id,
            "category": self.category.name if self.category else None,
            "venue": self.venue,
            "event_date": self.event_date.isoformat() if hasattr(self.event_date, "isoformat") else str(self.event_date),
            "event_time": self.event_time,
            "price": float(self.price),
            "total_tickets": self.total_tickets,
            "available_tickets": self.available_tickets,
            "organizer_name": self.organizer_name,
            "organizer_email": self.organizer_email,
            "has_tickets": self.ticketed(),
            "performers": self.performers or "",
            "food_details": self.food_details or "",
            "avg_rating": avg_rating,
            "review_count": review_count,
            "status": self.status,
        }


class Booking(db.Model):
    __tablename__ = "bookings"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    buyer_name = db.Column(db.String(120))
    buyer_email = db.Column(db.String(120))
    buyer_phone = db.Column(db.String(20))
    payment_method = db.Column(db.String(30), default="cod")
    transaction_uuid = db.Column(db.String(255))
    ref_id = db.Column(db.String(255))
    payment_proof = db.Column(db.String(255))
    proof_hash = db.Column(db.String(64), index=True)  # SHA-256 of the uploaded screenshot (duplicate detection)
    checked_in_count = db.Column(db.Integer, nullable=False, default=0)  # people already let in at the gate
    checked_in_at = db.Column(db.DateTime)                               # last gate scan
    kind = db.Column(db.String(10), nullable=False, default="ticket")  # ticket | rsvp (wedding / no-ticket events)
    paid_amount = db.Column(db.Numeric(10, 2))          # amount the user says he paid (must equal total for QR payments)
    payment_ref = db.Column(db.String(60), index=True)  # eSewa / Fonepay transaction (reference) ID typed by the user
    delivery_address = db.Column(db.String(255))        # Cash on Delivery only
    delivery_city = db.Column(db.String(80))
    delivery_landmark = db.Column(db.String(120))
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="bookings")
    event = db.relationship("Event", backref="bookings")

    def make_ticket_code(self):
        """Signed ticket code printed inside the QR. It cannot be guessed without the server secret."""
        from flask import current_app
        secret = current_app.config.get("SECRET_KEY", "")
        sig = hashlib.sha256(f"{self.id}:{self.transaction_uuid or ''}:{secret}".encode()).hexdigest()[:6].upper()
        return f"EMS-{self.id:05d}-{sig}"

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "event": self.event.title if self.event else None,
            "event_image": self.event.image_url if self.event else None,
            "event_date": self.event.event_date.isoformat() if self.event and hasattr(self.event.event_date, "isoformat") else None,
            "event_time": self.event.event_time if self.event else None,
            "venue": self.event.venue if self.event else None,
            "category": self.event.category.name if self.event and self.event.category else None,
            "performers": (self.event.performers or "") if self.event else "",
            "food_details": (self.event.food_details or "") if self.event else "",
            "organizer_name": self.event.organizer_name if self.event else None,
            "organizer_email": self.event.organizer_email if self.event else None,
            "user": (self.buyer_name or (self.user.full_name if self.user else None)),
            "quantity": self.quantity,
            "total_amount": float(self.total_amount),
            "payment_method": self.payment_method,
            "kind": self.kind or "ticket",
            "ticket_code": self.make_ticket_code(),
            "checked_in_count": self.checked_in_count or 0,
            "checked_in_at": self.checked_in_at.strftime("%Y-%m-%d %H:%M") if self.checked_in_at else None,
            "paid_amount": float(self.paid_amount) if self.paid_amount is not None else None,
            "payment_ref": self.payment_ref,
            "delivery_address": self.delivery_address,
            "delivery_city": self.delivery_city,
            "delivery_landmark": self.delivery_landmark,
            "buyer_phone": self.buyer_phone,
            "payment_proof": self.payment_proof,
            "payment_proof_url": f"/api/payments/proof/{self.payment_proof}" if self.payment_proof else None,
            "status": self.status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else None,
        }


class Review(db.Model):
    __tablename__ = "reviews"
    __table_args__ = (db.UniqueConstraint("user_id", "event_id", name="uq_review_user_event"),)

    id = db.Column(db.Integer, primary_key=True)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1..5
    comment = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="reviews")
    event = db.relationship("Event", backref=db.backref("reviews", cascade="all, delete-orphan"))

    def to_dict(self):
        return {
            "id": self.id,
            "event_id": self.event_id,
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else "User",
            "rating": self.rating,
            "comment": self.comment,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M") if self.created_at else None,
        }


class Wishlist(db.Model):
    __tablename__ = "wishlist"
    __table_args__ = (db.UniqueConstraint("user_id", "event_id", name="uq_wishlist_user_event"),)

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_id = db.Column(db.Integer, db.ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    event = db.relationship("Event", backref=db.backref("wishlisted_by", cascade="all, delete-orphan"))
