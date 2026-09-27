from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User

auth_bp = Blueprint("auth", __name__)

VALID_ROLES = {"donor", "recipient", "volunteer", "admin"}

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "").strip().lower()
    phone = data.get("phone", "").strip() or None
    address = data.get("address", "").strip() or None
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if not name or not email or not password or not role:
        return jsonify({"error": "Name, email, password, and role are required."}), 400

    if role not in VALID_ROLES:
        return jsonify({"error": f"Invalid role. Allowed roles: {', '.join(VALID_ROLES)}"}), 400

    try:
        if User.query.filter_by(email=email).first():
            return jsonify({"error": "This email is already registered. Please sign in instead."}), 409

        try:
            lat = float(latitude) if latitude is not None else None
            lng = float(longitude) if longitude is not None else None
        except (ValueError, TypeError):
            lat, lng = None, None

        hashed_pw = generate_password_hash(password)
        user = User(
            name=name,
            email=email,
            password_hash=hashed_pw,
            role=role,
            phone=phone,
            address=address,
            latitude=lat,
            longitude=lng,
        )

        db.session.add(user)
        db.session.commit()

        token = create_access_token(
            identity=str(user.id),
            additional_claims={"role": user.role, "email": user.email, "name": user.name}
        )

        return jsonify({
            "message": "User registered successfully",
            "token": token,
            "user": user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Registration error: {str(e)}"}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email, "name": user.name}
    )

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.to_dict()
    }), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({"user": user.to_dict()}), 200
