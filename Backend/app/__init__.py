import os
from flask import Flask
from dotenv import load_dotenv
from .extensions import db, jwt, cors

load_dotenv()

def create_app():
    app = Flask(__name__)
    db_uri = os.getenv("DATABASE_URL") or "sqlite:///foodbridge.db"
    if db_uri.startswith("postgresql://"):
        db_uri = db_uri.replace("postgresql://", "postgresql+psycopg2://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = db_uri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY") or "dev-secret-key-foodbridge-jwt-authentication-token-32bytes"

    db.init_app(app)
    jwt.init_app(app)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    cors.init_app(app, origins=[frontend_url])

    try:
        from .routes.auth import auth_bp
        app.register_blueprint(auth_bp, url_prefix="/api/auth")
    except (ImportError, AttributeError):
        pass

    try:
        from .routes.donations import donations_bp
        app.register_blueprint(donations_bp, url_prefix="/api/donations")
    except (ImportError, AttributeError):
        pass

    try:
        from .routes.matching import matching_bp
        app.register_blueprint(matching_bp, url_prefix="/api/matching")
    except (ImportError, AttributeError):
        pass

    try:
        from .routes.volunteers import volunteers_bp
        app.register_blueprint(volunteers_bp, url_prefix="/api/volunteers")
    except (ImportError, AttributeError):
        pass

    try:
        from .routes.admin import admin_bp
        app.register_blueprint(admin_bp, url_prefix="/api/admin")
    except (ImportError, AttributeError):
        pass

    return app
