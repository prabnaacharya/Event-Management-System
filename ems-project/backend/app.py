import os
from flask import Flask, jsonify
from config import Config
from extensions import db, jwt, cors
from routes.auth import auth_bp
from routes.events import events_bp
from routes.categories import categories_bp
from routes.bookings import bookings_bp
from routes.admin import admin_bp
from routes.payments import payments_bp
from routes.reviews import reviews_bp
from routes.wishlist import wishlist_bp
def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    app.register_blueprint(auth_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(wishlist_bp)

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "message": "EMS API is running"})

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
