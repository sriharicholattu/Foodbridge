from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from ..extensions import db
from ..models import Donation, User, Notification

donations_bp = Blueprint("donations", __name__)

VALID_STATUSES = {
    "posted",
    "matched",
    "accepted",
    "picked_up",
    "delivered",
    "completed",
    "expired",
}

def parse_iso_datetime(dt_str):
    if not dt_str:
        return None
    try:
        clean_str = dt_str.replace("Z", "+00:00")
        return datetime.fromisoformat(clean_str)
    except (ValueError, TypeError):
        return None


@donations_bp.route("", methods=["POST"])
@jwt_required()
def create_donation():
    donor_id = get_jwt_identity()
    user = User.query.get(donor_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    food_type = data.get("food_type", "").strip()
    quantity = data.get("quantity", "").strip()
    pickup_location = data.get("pickup_location", "").strip() or user.address

    if not food_type or not quantity:
        return jsonify({"error": "food_type and quantity are required"}), 400

    prep_time = parse_iso_datetime(data.get("preparation_time"))
    avail_start = parse_iso_datetime(data.get("availability_start"))
    avail_end = parse_iso_datetime(data.get("availability_end"))

    lat = data.get("latitude")
    lng = data.get("longitude")
    try:
        lat = float(lat) if lat is not None else user.latitude
        lng = float(lng) if lng is not None else user.longitude
    except (ValueError, TypeError):
        lat, lng = user.latitude, user.longitude

    donation = Donation(
        donor_id=user.id,
        food_type=food_type,
        quantity=quantity,
        preparation_time=prep_time,
        availability_start=avail_start,
        availability_end=avail_end,
        pickup_location=pickup_location,
        latitude=lat,
        longitude=lng,
        status="posted",
    )

    db.session.add(donation)

    # Add confirmation notification for donor
    notif = Notification(
        user_id=user.id,
        message=f"Your donation of {quantity} of {food_type} has been posted successfully."
    )
    db.session.add(notif)
    db.session.commit()

    # Automatically trigger matching engine for this new donation
    try:
        from .matching import generate_matches_for_donation
        generate_matches_for_donation(donation)
    except Exception as e:
        print("Automatic matching on donation post:", e)

    return jsonify({
        "message": "Donation created successfully",
        "donation": donation.to_dict()
    }), 201


@donations_bp.route("", methods=["GET"])
def get_donations():
    status_filter = request.args.get("status")
    only_my = request.args.get("my", "").lower() == "true"

    query = Donation.query

    if only_my:
        try:
            verify_jwt_in_request()
            current_user_id = get_jwt_identity()
            query = query.filter_by(donor_id=current_user_id)
        except Exception:
            return jsonify({"error": "Authentication required for 'my' donations"}), 401
    elif status_filter and status_filter.lower() != "all":
        query = query.filter_by(status=status_filter.lower())

    donations = query.order_by(Donation.created_at.desc()).all()
    return jsonify({
        "donations": [d.to_dict() for d in donations],
        "count": len(donations)
    }), 200


@donations_bp.route("/my", methods=["GET"])
@jwt_required()
def get_my_donations():
    current_user_id = get_jwt_identity()
    donations = Donation.query.filter_by(donor_id=current_user_id).order_by(Donation.created_at.desc()).all()

    results = []
    for d in donations:
        d_dict = d.to_dict()
        accepted_match = next((m for m in d.matches if m.status == "accepted"), None)
        if accepted_match and accepted_match.recipient:
            from ..models import RecipientRequirement
            req = RecipientRequirement.query.filter_by(
                recipient_id=accepted_match.recipient_id, active=True
            ).first()
            is_self = bool(req and req.pickup_available)
            d_dict["accepted_recipient"] = {
                "name": accepted_match.recipient.name,
                "phone": accepted_match.recipient.phone,
                "address": accepted_match.recipient.address,
                "is_self_pickup": is_self,
            }
            d_dict["is_self_pickup"] = is_self
        else:
            d_dict["accepted_recipient"] = None
            d_dict["is_self_pickup"] = False
        results.append(d_dict)

    return jsonify({
        "donations": results,
        "count": len(results)
    }), 200


@donations_bp.route("/<donation_id>", methods=["GET"])
def get_donation(donation_id):
    donation = Donation.query.get(donation_id)
    if not donation:
        return jsonify({"error": "Donation not found"}), 404

    data = donation.to_dict()
    data["matches"] = [m.to_dict() for m in donation.matches]
    data["volunteer_assignment"] = (
        donation.volunteer_assignment.to_dict()
        if donation.volunteer_assignment
        else None
    )
    return jsonify({"donation": data}), 200


@donations_bp.route("/<donation_id>/status", methods=["PATCH"])
@jwt_required()
def update_donation_status(donation_id):
    donation = Donation.query.get(donation_id)
    if not donation:
        return jsonify({"error": "Donation not found"}), 404

    data = request.get_json() or {}
    new_status = data.get("status", "").strip().lower()

    if new_status not in VALID_STATUSES:
        return jsonify({"error": f"Invalid status. Allowed: {', '.join(VALID_STATUSES)}"}), 400

    donation.status = new_status

    # Notify donor
    notif = Notification(
        user_id=donation.donor_id,
        message=f"Update on your {donation.food_type} donation: Status is now '{new_status}'."
    )
    db.session.add(notif)
    db.session.commit()

    return jsonify({
        "message": f"Donation status updated to {new_status}",
        "donation": donation.to_dict()
    }), 200


@donations_bp.route("/<donation_id>", methods=["DELETE"])
@jwt_required()
def delete_donation(donation_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    donation = Donation.query.get(donation_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    if not donation:
        return jsonify({"error": "Donation not found"}), 404

    # Allow owner or admin to delete
    if str(donation.donor_id) != str(current_user_id) and user.role != "admin":
        return jsonify({"error": "Unauthorized to delete this donation"}), 403

    db.session.delete(donation)
    db.session.commit()
    return jsonify({"message": "Donation deleted successfully"}), 200


@donations_bp.route("/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    current_user_id = get_jwt_identity()
    notifs = Notification.query.filter_by(user_id=current_user_id).order_by(
        Notification.created_at.desc()
    ).all()
    return jsonify({"notifications": [n.to_dict() for n in notifs]}), 200


@donations_bp.route("/notifications/<notif_id>/read", methods=["PATCH"])
@jwt_required()
def mark_notification_read(notif_id):
    current_user_id = get_jwt_identity()
    notif = Notification.query.get(notif_id)
    if not notif or str(notif.user_id) != str(current_user_id):
        return jsonify({"error": "Notification not found"}), 404

    notif.is_read = True
    db.session.commit()
    return jsonify({"message": "Notification marked as read", "notification": notif.to_dict()}), 200
