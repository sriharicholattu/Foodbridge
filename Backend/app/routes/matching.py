import math
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models import Donation, User, Match, RecipientRequirement, Notification

matching_bp = Blueprint("matching", __name__)


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great-circle distance between two points on Earth in km."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    except (ValueError, TypeError):
        return None

    r = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)


def score_recipient_for_donation(recipient, donation):
    """
    Score a recipient for a given donation based on:
    - Distance (Haversine formula on lat/lng) (weight ~50%)
    - Food type requirement match (weight ~30%)
    - Pickup availability (weight ~20%)
    """
    dist_km = haversine_distance(
        donation.latitude, donation.longitude, recipient.latitude, recipient.longitude
    )

    # 1. Distance score (closer is better, max 50 points)
    if dist_km is not None:
        dist_score = max(0.0, 50.0 - (dist_km * 1.5))
    else:
        dist_score = 25.0  # neutral midpoint if coordinates missing

    # 2. Requirement fit
    active_reqs = RecipientRequirement.query.filter_by(
        recipient_id=recipient.id, active=True
    ).all()

    food_match_score = 10.0  # default baseline
    pickup_score = 10.0      # default baseline

    donation_food = (donation.food_type or "").lower()

    for req in active_reqs:
        req_food = (req.food_type or "").lower()
        if req_food and (req_food in donation_food or donation_food in req_food):
            food_match_score = 30.0  # exact or substring match
        if req.pickup_available:
            pickup_score = 20.0

    total_score = min(100.0, round(dist_score + food_match_score + pickup_score, 1))
    return total_score, dist_km


def generate_matches_for_donation(donation):
    """Scan all recipients and generate/update matches for a donation."""
    if not donation or donation.status not in ["posted", "matched"]:
        return []

    recipients = User.query.filter_by(role="recipient").all()
    results = []

    for rec in recipients:
        score, dist_km = score_recipient_for_donation(rec, donation)
        existing_match = Match.query.filter_by(
            donation_id=donation.id, recipient_id=rec.id
        ).first()

        if not existing_match:
            new_match = Match(
                donation_id=donation.id,
                recipient_id=rec.id,
                match_score=score,
                status="suggested",
            )
            db.session.add(new_match)
            results.append(new_match)
        else:
            if existing_match.status == "suggested":
                existing_match.match_score = score
            results.append(existing_match)

    db.session.commit()
    return results


def generate_matches_for_recipient(recipient):
    """Scan all active posted donations and generate/update matches for a recipient."""
    if not recipient or recipient.role != "recipient":
        return []

    donations = Donation.query.filter(
        Donation.status.in_(["posted", "matched"])
    ).all()
    results = []

    for donation in donations:
        score, dist_km = score_recipient_for_donation(recipient, donation)
        existing_match = Match.query.filter_by(
            donation_id=donation.id, recipient_id=recipient.id
        ).first()

        if not existing_match:
            new_match = Match(
                donation_id=donation.id,
                recipient_id=recipient.id,
                match_score=score,
                status="suggested",
            )
            db.session.add(new_match)
            results.append(new_match)
        else:
            if existing_match.status == "suggested":
                existing_match.match_score = score
            results.append(existing_match)

    db.session.commit()
    return results


@matching_bp.route("/find/<donation_id>", methods=["GET", "POST"])
def find_matches_for_donation(donation_id):
    donation = Donation.query.get(donation_id)
    if not donation:
        return jsonify({"error": "Donation not found"}), 404

    generate_matches_for_donation(donation)
    matches = Match.query.filter_by(donation_id=donation.id).order_by(Match.match_score.desc()).all()

    return jsonify({
        "donation": donation.to_dict(),
        "matches": [m.to_dict() for m in matches],
        "count": len(matches),
    }), 200


@matching_bp.route("/recipient", methods=["GET"])
@jwt_required()
def get_recipient_matches():
    recipient_id = get_jwt_identity()
    user = User.query.get(recipient_id)
    if not user or user.role != "recipient":
        return jsonify({"error": "Only registered recipients can access this endpoint"}), 403

    # Automatically scan all active donations and generate fresh matches
    generate_matches_for_recipient(user)

    status_filter = request.args.get("status")
    query = Match.query.filter_by(recipient_id=user.id)
    if status_filter:
        query = query.filter_by(status=status_filter.lower())

    matches = query.order_by(Match.match_score.desc()).all()
    # Filter matches to only include active donations
    active_matches = [
        m.to_dict() for m in matches
        if m.donation and m.donation.status in ["posted", "matched", "accepted"]
    ]

    return jsonify({
        "matches": active_matches,
        "count": len(active_matches)
    }), 200


@matching_bp.route("/<match_id>/respond", methods=["POST"])
@jwt_required()
def respond_to_match(match_id):
    user_id = get_jwt_identity()
    match = Match.query.get(match_id)
    if not match:
        return jsonify({"error": "Match not found"}), 404

    if str(match.recipient_id) != str(user_id):
        return jsonify({"error": "Unauthorized to respond to this match"}), 403

    data = request.get_json() or {}
    decision = data.get("status", "").strip().lower()

    if decision not in {"accepted", "rejected"}:
        return jsonify({"error": "status must be either 'accepted' or 'rejected'"}), 400

    match.status = decision

    donation = Donation.query.get(match.donation_id)
    if donation and decision == "accepted":
        donation.status = "matched"
        # Notify donor that recipient accepted
        notif = Notification(
            user_id=donation.donor_id,
            message=f"{match.recipient.name} accepted your donation of {donation.food_type}."
        )
        db.session.add(notif)

    db.session.commit()
    return jsonify({
        "message": f"Match {decision} successfully",
        "match": match.to_dict()
    }), 200


@matching_bp.route("/requirements", methods=["POST"])
@jwt_required()
def save_recipient_requirements():
    recipient_id = get_jwt_identity()
    user = User.query.get(recipient_id)
    if not user or user.role != "recipient":
        return jsonify({"error": "Only recipients can set requirements"}), 403

    data = request.get_json() or {}
    food_type = data.get("food_type", "").strip()
    quantity_needed = data.get("quantity_needed", "").strip()
    pickup_available = bool(data.get("pickup_available", False))
    active = bool(data.get("active", True))

    req = RecipientRequirement.query.filter_by(recipient_id=user.id).first()
    if not req:
        req = RecipientRequirement(
            recipient_id=user.id,
            food_type=food_type,
            quantity_needed=quantity_needed,
            pickup_available=pickup_available,
            active=active,
        )
        db.session.add(req)
    else:
        req.food_type = food_type or req.food_type
        req.quantity_needed = quantity_needed or req.quantity_needed
        req.pickup_available = pickup_available
        req.active = active

    db.session.commit()

    # Re-evaluate all active donations for this recipient with updated requirement
    generate_matches_for_recipient(user)

    req_dict = req.to_dict()
    return jsonify({
        "message": "Requirements saved successfully",
        "requirement": req_dict,
        "requirements": [req_dict]
    }), 200


@matching_bp.route("/requirements", methods=["GET"])
@jwt_required()
def get_recipient_requirements():
    recipient_id = get_jwt_identity()
    req = RecipientRequirement.query.filter_by(recipient_id=recipient_id, active=True).first()
    req_dict = req.to_dict() if req else None
    return jsonify({
        "requirement": req_dict,
        "requirements": [req_dict] if req_dict else []
    }), 200