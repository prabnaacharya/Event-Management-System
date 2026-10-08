"""
Optional: run once after importing schema.sql if you want to (re)create the
admin login through SQLAlchemy.   Usage:  python seed.py
(schema.sql already inserts the admin, so this is normally not needed.)
"""
from app import create_app
from extensions import db
from models import User, Category

app = create_app()

with app.app_context():
    db.create_all()

    if not Category.query.first():
        db.session.add_all([
            Category(name="Concerts", icon="Music"),
            Category(name="Conferences", icon="Users"),
            Category(name="Workshops", icon="Wrench"),
            Category(name="Sports", icon="Trophy"),
            Category(name="Festivals", icon="PartyPopper"),
        ])
        db.session.commit()
        print("Seeded categories")

    if not User.query.filter_by(email="admin@ems.com").first():
        admin = User(full_name="Admin", email="admin@ems.com", role="admin")
        admin.set_password("Admin@123")
        db.session.add(admin)
        db.session.commit()
        print("Created admin -> admin@ems.com / Admin@123")
    else:
        print("Admin already exists")
