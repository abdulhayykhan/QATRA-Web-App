"""Shared domain enums used across schemas, models, and routers."""
from enum import Enum


class UserRole(str, Enum):
    GUEST = "guest"
    VERIFIED_SEEKER = "verified_seeker"
    VERIFIED_DONOR = "verified_donor"
    ORGANIZER = "organizer"
    ADMIN = "admin"


class BloodGroup(str, Enum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"


class ComponentType(str, Enum):
    WHOLE_BLOOD = "Whole Blood"
    PRBC = "PRBC"  # Packed Red Blood Cells
    PLATELETS = "Platelets"
    PLASMA = "Plasma"


class UrgencyTier(str, Enum):
    WITHIN_2_HOURS = "within_2_hours"
    WITHIN_24_HOURS = "within_24_hours"


class RequestStatus(str, Enum):
    PENDING_VERIFICATION = "pending_verification"
    VERIFIED = "verified"
    MATCHED = "matched"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"


class NotificationType(str, Enum):
    PROXIMITY_ALERT = "proximity_alert"
    RARE_BLOOD_ALERT = "rare_blood_alert"
    COOLDOWN_RESET = "cooldown_reset"
    SYSTEM = "system"


class EventType(str, Enum):
    BLOOD_DRIVE = "blood_drive"
    AWARENESS_SESSION = "awareness_session"


class RegistrationType(str, Enum):
    DONOR = "donor"
    VOLUNTEER = "volunteer"


class EligibilityStatus(str, Enum):
    ELIGIBLE = "eligible"
    MAY_NEED_CONFIRMATION = "may_need_confirmation"
    NOT_ELIGIBLE = "not_eligible"
