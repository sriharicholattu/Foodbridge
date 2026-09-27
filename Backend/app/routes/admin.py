from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import User, Donation, Match, VolunteerAssignment

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/stats", methods=["GET"])
def get_admin_stats():
    """Retrieve aggregate platform metrics for admin dashboard."""
    total_users = User.query.count()
    donors_count = User.query.filter_by(role="donor").count()
    recipients_count = User.query.filter_by(role="recipient").count()
    volunteers_count = User.query.filter_by(role="volunteer").count()
    admins_count = User.query.filter_by(role="admin").count()

    total_donations = Donation.query.count()
    posted_donations = Donation.query.filter_by(status="posted").count()
    matched_donations = Donation.query.filter_by(status="matched").count()
    accepted_donations = Donation.query.filter_by(status="accepted").count()
    picked_up_donations = Donation.query.filter_by(status="picked_up").count()
    delivered_donations = Donation.query.filter_by(status="delivered").count()

    total_matches = Match.query.count()
    accepted_matches = Match.query.filter_by(status="accepted").count()

    total_deliveries = VolunteerAssignment.query.filter_by(status="delivered").count()

    return jsonify({
        "stats": {
            "users": {
                "total": total_users,
                "donors": donors_count,
                "recipients": recipients_count,
                "volunteers": volunteers_count,
                "admins": admins_count,
            },
            "donations": {
                "total": total_donations,
                "posted": posted_donations,
                "matched": matched_donations,
                "accepted": accepted_donations,
                "picked_up": picked_up_donations,
                "delivered": delivered_donations,
            },
            "matches": {
                "total": total_matches,
                "accepted": accepted_matches,
            },
            "deliveries": {
                "completed": total_deliveries,
            },
        }
    }), 200


@admin_bp.route("/users", methods=["GET"])
def get_all_users():
    """List all registered users."""
    role_filter = request.args.get("role")
    query = User.query
    if role_filter:
        query = query.filter_by(role=role_filter.lower())

    users = query.order_by(User.created_at.desc()).all()
    return jsonify({
        "users": [u.to_dict() for u in users],
        "count": len(users)
    }), 200


@admin_bp.route("/donations", methods=["GET"])
def get_all_donations():
    """List all donations with donor and status information."""
    donations = Donation.query.order_by(Donation.created_at.desc()).all()
    results = []
    for d in donations:
        item = d.to_dict()
        item["matches_count"] = len(d.matches)
        item["has_volunteer"] = bool(d.volunteer_assignment)
        results.append(item)

    return jsonify({
        "donations": results,
        "count": len(results)
    }), 200


@admin_bp.route("/users/<user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    current_admin_id = get_jwt_identity()
    admin_user = User.query.get(current_admin_id)
    if not admin_user or admin_user.role != "admin":
        return jsonify({"error": "Admin privileges required"}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": f"User {user.name} deleted successfully"}), 200