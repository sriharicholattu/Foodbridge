from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Donation, User, VolunteerAssignment, Notification

volunteers_bp = Blueprint("volunteers", __name__)

VALID_ASSIGNMENT_STATUSES = {"assigned", "picked_up", "delivered"}


@volunteers_bp.route("/available-deliveries", methods=["GET"])
def get_available_deliveries():
    """List donations that are matched or accepted and need volunteer pickup."""
    # Find donations in 'matched' or 'accepted' status that do not have an active volunteer assignment
    donations = Donation.query.filter(
        Donation.status.in_(["matched", "accepted"])
    ).order_by(Donation.created_at.desc()).all()

    available = []
    for d in donations:
        # If the recipient specified self-pickup, do not list for volunteer drivers
        accepted_match = next((m for m in d.matches if m.status == "accepted"), None)
        if accepted_match:
            from ..models import RecipientRequirement
            req = RecipientRequirement.query.filter_by(
                recipient_id=accepted_match.recipient_id, active=True
            ).first()
            if req and req.pickup_available:
                continue

        if not d.volunteer_assignment or d.volunteer_assignment.status not in ["assigned", "picked_up"]:
            available.append(d.to_dict())

    return jsonify({"available_donations": available, "count": len(available)}), 200


@volunteers_bp.route("/assign", methods=["POST"])
@jwt_required()
def assign_volunteer():
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json() or {}
    donation_id = data.get("donation_id")
    target_volunteer_id = data.get("volunteer_id")

    if not donation_id:
        return jsonify({"error": "donation_id is required"}), 400

    donation = Donation.query.get(donation_id)
    if not donation:
        return jsonify({"error": "Donation not found"}), 404

    # Prevent assigning volunteer if donation is direct self-pickup
    accepted_match = next((m for m in donation.matches if m.status == "accepted"), None)
    if accepted_match:
        from ..models import RecipientRequirement
        req = RecipientRequirement.query.filter_by(
            recipient_id=accepted_match.recipient_id, active=True
        ).first()
        if req and req.pickup_available:
            return jsonify({
                "error": "This donation is scheduled for direct self-pickup by the recipient NGO and does not require volunteer delivery."
            }), 400

    # Determine volunteer ID: either specified by admin or self-assigned
    if user.role == "admin" and target_volunteer_id:
        assigned_volunteer_id = target_volunteer_id
    elif user.role == "volunteer":
        assigned_volunteer_id = user.id
    else:
        return jsonify({"error": "Only volunteers can self-assign or admins can assign volunteers"}), 403

    volunteer = User.query.get(assigned_volunteer_id)
    if not volunteer:
        return jsonify({"error": "Volunteer user not found"}), 404

    # Check for existing assignment
    assignment = VolunteerAssignment.query.filter_by(donation_id=donation.id).first()
    if assignment:
        assignment.volunteer_id = volunteer.id
        assignment.status = "assigned"
    else:
        assignment = VolunteerAssignment(
            donation_id=donation.id,
            volunteer_id=volunteer.id,
            status="assigned"
        )
        db.session.add(assignment)

    # Update donation status
    donation.status = "accepted"

    # Notify donor
    notif = Notification(
        user_id=donation.donor_id,
        message=f"Volunteer {volunteer.name} has been assigned to pick up your donation of {donation.food_type}."
    )
    db.session.add(notif)
    db.session.commit()

    return jsonify({
        "message": f"Volunteer {volunteer.name} assigned successfully",
        "assignment": assignment.to_dict()
    }), 201


@volunteers_bp.route("/my-assignments", methods=["GET"])
@jwt_required()
def get_my_assignments():
    current_user_id = get_jwt_identity()
    assignments = VolunteerAssignment.query.filter_by(
        volunteer_id=current_user_id
    ).order_by(VolunteerAssignment.assigned_at.desc()).all()

    return jsonify({
        "assignments": [a.to_dict() for a in assignments],
        "count": len(assignments)
    }), 200


@volunteers_bp.route("/assignments/<assignment_id>/status", methods=["PATCH"])
@jwt_required()
def update_assignment_status(assignment_id):
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    assignment = VolunteerAssignment.query.get(assignment_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404

    if str(assignment.volunteer_id) != str(current_user_id) and user.role != "admin":
        return jsonify({"error": "Unauthorized to update this assignment"}), 403

    data = request.get_json() or {}
    new_status = data.get("status", "").strip().lower()

    if new_status not in VALID_ASSIGNMENT_STATUSES:
        return jsonify({
            "error": f"Invalid status. Allowed: {', '.join(VALID_ASSIGNMENT_STATUSES)}"
        }), 400

    assignment.status = new_status
    donation = Donation.query.get(assignment.donation_id)

    if donation:
        if new_status == "picked_up":
            donation.status = "picked_up"
            db.session.add(Notification(
                user_id=donation.donor_id,
                message=f"Your donation of {donation.food_type} has been picked up by the volunteer."
            ))
        elif new_status == "delivered":
            donation.status = "delivered"
            db.session.add(Notification(
                user_id=donation.donor_id,
                message=f"Your donation of {donation.food_type} has been successfully delivered!"
            ))

    db.session.commit()

    return jsonify({
        "message": f"Status updated to '{new_status}'",
        "assignment": assignment.to_dict()
    }), 200