import uuid
from datetime import datetime, timezone
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from .extensions import db


class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's native UUID type when on PostgreSQL,
    and CHAR(36) on SQLite, gracefully accepting both str and uuid.UUID.
    """
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return uuid.UUID(str(value))


class BaseModel(db.Model):
    __abstract__ = True

    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class User(BaseModel):
    __tablename__ = "users"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'donor', 'recipient', 'volunteer', 'admin'
    phone = db.Column(db.String(20))
    address = db.Column(db.Text)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "phone": self.phone,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Donation(BaseModel):
    __tablename__ = "donations"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    donor_id = db.Column(GUID(), db.ForeignKey("users.id"))
    food_type = db.Column(db.String(100))
    quantity = db.Column(db.String(50))
    preparation_time = db.Column(db.DateTime)
    availability_start = db.Column(db.DateTime)
    availability_end = db.Column(db.DateTime)
    pickup_location = db.Column(db.Text)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    status = db.Column(db.String(30), default="posted")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    donor = db.relationship("User", backref="donations", foreign_keys=[donor_id])
    matches = db.relationship("Match", backref="donation", cascade="all, delete-orphan")
    volunteer_assignment = db.relationship("VolunteerAssignment", backref="donation", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": str(self.id),
            "donor_id": str(self.donor_id) if self.donor_id else None,
            "donor_name": self.donor.name if self.donor else None,
            "donor_phone": self.donor.phone if self.donor else None,
            "food_type": self.food_type,
            "quantity": self.quantity,
            "preparation_time": self.preparation_time.isoformat() if self.preparation_time else None,
            "availability_start": self.availability_start.isoformat() if self.availability_start else None,
            "availability_end": self.availability_end.isoformat() if self.availability_end else None,
            "pickup_location": self.pickup_location,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class RecipientRequirement(BaseModel):
    __tablename__ = "recipient_requirements"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    recipient_id = db.Column(GUID(), db.ForeignKey("users.id"))
    food_type = db.Column(db.String(100))
    quantity_needed = db.Column(db.String(50))
    pickup_available = db.Column(db.Boolean, default=False)
    active = db.Column(db.Boolean, default=True)

    recipient = db.relationship("User", backref="requirements", foreign_keys=[recipient_id])

    def to_dict(self):
        return {
            "id": str(self.id),
            "recipient_id": str(self.recipient_id) if self.recipient_id else None,
            "food_type": self.food_type,
            "quantity_needed": self.quantity_needed,
            "pickup_available": self.pickup_available,
            "active": self.active,
        }


class Match(BaseModel):
    __tablename__ = "matches"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    donation_id = db.Column(GUID(), db.ForeignKey("donations.id"))
    recipient_id = db.Column(GUID(), db.ForeignKey("users.id"))
    match_score = db.Column(db.Float)
    status = db.Column(db.String(30), default="suggested")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    recipient = db.relationship("User", backref="matches", foreign_keys=[recipient_id])

    def to_dict(self):
        donation = getattr(self, "donation", None)
        return {
            "id": str(self.id),
            "donation_id": str(self.donation_id) if self.donation_id else None,
            "recipient_id": str(self.recipient_id) if self.recipient_id else None,
            "recipient_name": self.recipient.name if self.recipient else None,
            "recipient_address": self.recipient.address if self.recipient else None,
            "recipient_phone": self.recipient.phone if self.recipient else None,
            "match_score": self.match_score,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "donation": donation.to_dict() if donation else None,
        }


class VolunteerAssignment(BaseModel):
    __tablename__ = "volunteer_assignments"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    donation_id = db.Column(GUID(), db.ForeignKey("donations.id"))
    volunteer_id = db.Column(GUID(), db.ForeignKey("users.id"))
    status = db.Column(db.String(30), default="assigned")
    assigned_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    volunteer = db.relationship("User", backref="volunteer_assignments", foreign_keys=[volunteer_id])

    def to_dict(self):
        donation = getattr(self, "donation", None)
        recipient_info = None
        if donation and getattr(donation, "matches", None):
            accepted_match = next((m for m in donation.matches if m.status == "accepted"), None)
            if not accepted_match and donation.matches:
                accepted_match = donation.matches[0]
            if accepted_match and accepted_match.recipient:
                recipient_info = {
                    "id": str(accepted_match.recipient.id),
                    "name": accepted_match.recipient.name,
                    "address": accepted_match.recipient.address,
                    "phone": accepted_match.recipient.phone,
                    "latitude": accepted_match.recipient.latitude,
                    "longitude": accepted_match.recipient.longitude,
                }

        return {
            "id": str(self.id),
            "donation_id": str(self.donation_id) if self.donation_id else None,
            "volunteer_id": str(self.volunteer_id) if self.volunteer_id else None,
            "volunteer_name": self.volunteer.name if self.volunteer else None,
            "volunteer_phone": self.volunteer.phone if self.volunteer else None,
            "status": self.status,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
            "donation": donation.to_dict() if donation else None,
            "recipient": recipient_info,
        }


class Notification(BaseModel):
    __tablename__ = "notifications"

    id = db.Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = db.Column(GUID(), db.ForeignKey("users.id"))
    message = db.Column(db.Text)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", backref="notifications", foreign_keys=[user_id])

    def to_dict(self):
        return {
            "id": str(self.id),
            "user_id": str(self.user_id) if self.user_id else None,
            "message": self.message,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }