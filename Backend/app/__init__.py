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
    frontend_env = os.getenv("FRONTEND_URL", "http://localhost:5173")
    allowed_origins = [o.strip() for o in frontend_env.split(",") if o.strip()]
    if "*" in allowed_origins:
        cors.init_app(app, resources={r"/*": {"origins": "*"}})
    else:
        # Also always include localhost:5173 for seamless local dev alongside production
        if "http://localhost:5173" not in allowed_origins:
            allowed_origins.append("http://localhost:5173")
        cors.init_app(app, resources={r"/*": {"origins": allowed_origins}}, supports_credentials=True)

    @app.route("/")
    @app.route("/api/health")
    def health_check():
        return {"status": "ok", "message": "FoodBridge API is live and healthy"}, 200

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


# Module-level WSGI instance for runners like 'gunicorn app:app'
app = create_app()
