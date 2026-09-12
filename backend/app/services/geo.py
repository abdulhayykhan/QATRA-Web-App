"""Proximity query service, Haversine spatial math, and compatibility engine (FR 1.3, FR 1.4).

Owner: Hareem Israr (Feature 1: Live Map Integration & Proximity Matching)
"""
import math
from datetime import datetime, timezone
from typing import Tuple, List, Optional, Dict, Any, Set

from sqlalchemy.orm import Session

from app.models.donor import Donor
from app.models.request import Request
from app.services.cooldown import is_donor_eligible_for_dispatch

EARTH_RADIUS_KM = 6371.0


# Red Blood Cell Transfusion Compatibility Matrix
# Donor Blood Group -> Set of Compatible Recipient Blood Groups
BLOOD_COMPATIBILITY: Dict[str, List[str]] = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"],
}

# Inverted: Recipient Blood Group -> Set of Acceptable Donor Blood Groups
RECIPIENT_ACCEPTABLE_DONORS: Dict[str, List[str]] = {
    "O-": ["O-"],
    "O+": ["O-", "O+"],
    "A-": ["O-", "A-"],
    "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"],
    "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
}

RARE_BLOOD_GROUPS = {"O-", "AB-", "B-", "A-"}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two spatial points using the Haversine formula.
    Accurate to within meters across urban and regional scales.
    """
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)

    r_lat1 = math.radians(lat1)
    r_lat2 = math.radians(lat2)

    a = (
        math.sin(d_lat / 2.0) ** 2
        + math.cos(r_lat1) * math.cos(r_lat2) * math.sin(d_lon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    distance = EARTH_RADIUS_KM * c
    return round(distance, 2)


def get_bounding_box(
    latitude: float,
    longitude: float,
    radius_km: float,
) -> Tuple[float, float, float, float]:
    """
    Computes a rectangular coordinate bounding box for initial fast database indexing/filtering.
    Returns: (min_latitude, max_latitude, min_longitude, max_longitude).
    """
    # 1 degree of latitude is approximately 111.0 km
    lat_delta = radius_km / 111.0
    min_lat = max(-90.0, latitude - lat_delta)
    max_lat = min(90.0, latitude + lat_delta)

    # 1 degree of longitude depends on latitude
    lat_rad = math.radians(latitude)
    cos_lat = math.cos(lat_rad)
    if abs(cos_lat) > 1e-6:
        lon_delta = radius_km / (111.0 * cos_lat)
    else:
        lon_delta = 180.0

    min_lon = max(-180.0, longitude - lon_delta)
    max_lon = min(180.0, longitude + lon_delta)

    return (round(min_lat, 6), round(max_lat, 6), round(min_lon, 6), round(max_lon, 6))


def is_blood_group_compatible(donor_group: str, recipient_group: str) -> bool:
    """
    Determines if donor's red blood cells can be safely transfused to the recipient.
    """
    d_grp = donor_group.strip().upper()
    r_grp = recipient_group.strip().upper()
    allowed_recipients = BLOOD_COMPATIBILITY.get(d_grp, [])
    return r_grp in allowed_recipients


def get_compatible_donor_groups(recipient_group: str) -> List[str]:
    """
    Returns list of donor blood groups compatible with the given recipient blood group.
    """
    r_grp = recipient_group.strip().upper()
    return RECIPIENT_ACCEPTABLE_DONORS.get(r_grp, [r_grp])


def is_rare_blood_group(blood_group: str) -> bool:
    """
    Identifies high-scarcity blood groups that trigger immediate escalation.
    """
    return blood_group.strip().upper() in RARE_BLOOD_GROUPS


def estimate_arrival_minutes(distance_km: float) -> int:
    """
    Calculates estimated travel and arrival time in minutes for urban traffic (e.g. Karachi).
    Includes a 5-minute initial dispatch buffer plus ~2.5 min/km (~24 km/h average velocity).
    """
    if distance_km <= 0:
        return 5
    return max(5, int(round(5.0 + distance_km * 2.5)))


def is_location_stale(
    location_updated_at: Optional[datetime],
    stale_threshold_minutes: int = 30,
) -> bool:
    """
    Checks if donor's last known location is older than the configured threshold (FR 1.1.2, Sec 3.4).
    """
    if not location_updated_at:
        return True
    if location_updated_at.tzinfo is None:
        location_updated_at = location_updated_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    age_seconds = (now - location_updated_at).total_seconds()
    return age_seconds > (stale_threshold_minutes * 60)


def find_eligible_donors_in_radius(
    db: Session,
    hospital_lat: float,
    hospital_lon: float,
    blood_group: str,
    radius_km: float,
    declined_donor_ids: Optional[Set[int]] = None,
) -> List[Dict[str, Any]]:
    """
    Finds and ranks all eligible donors within radius_km (FR 1.3.1, FR 1.4):
    1. Blood group compatibility filter (Universal O-, recipient matching).
    2. Availability & pre-screening pass filter.
    3. 90-day cooldown status verification.
    4. Bounding-box pre-filtering + exact Haversine distance computation.
    5. Proximity ranking: sorted ascending by distance, deprioritizing past decliners (FR 1.4.2)
       and slightly penalizing stale location updates (>30 min).
    """
    compatible_groups = get_compatible_donor_groups(blood_group)
    min_lat, max_lat, min_lon, max_lon = get_bounding_box(hospital_lat, hospital_lon, radius_km)

    # Initial fast bounding-box query
    candidate_donors = (
        db.query(Donor)
        .filter(
            Donor.blood_group.in_(compatible_groups),
            Donor.is_available.is_(True),
            Donor.pre_screening_passed.is_(True),
            Donor.latitude.isnot(None),
            Donor.longitude.isnot(None),
            Donor.latitude.between(min_lat, max_lat),
            Donor.longitude.between(min_lon, max_lon),
        )
        .all()
    )

    ranked_matches: List[Dict[str, Any]] = []

    for donor in candidate_donors:
        # Check active 90-day cooldown
        if not is_donor_eligible_for_dispatch(donor):
            continue

        # Exact Haversine distance calculation
        distance = haversine_distance_km(
            hospital_lat, hospital_lon, donor.latitude, donor.longitude
        )

        if distance <= radius_km:
            is_declined = bool(declined_donor_ids and donor.id in declined_donor_ids)
            is_stale = is_location_stale(donor.location_updated_at)
            eta_mins = estimate_arrival_minutes(distance)

            ranked_matches.append({
                "donor_id": donor.id,
                "blood_group": donor.blood_group,
                "distance_km": distance,
                "estimated_arrival_minutes": eta_mins,
                "is_available": donor.is_available,
                "is_declined": is_declined,
                "is_stale": is_stale,
            })

    # Proximity ranking per FR 1.4.1 & FR 1.4.2:
    # Sort order:
    # 1. Non-declined first (0), past decliners deprioritized (1)
    # 2. Fresh location fix first (0), stale fix (>30m) slightly deprioritized (1)
    # 3. Distance ascending (closest first)
    ranked_matches.sort(
        key=lambda d: (
            1 if d["is_declined"] else 0,
            1 if d["is_stale"] else 0,
            d["distance_km"],
        )
    )

    return ranked_matches


def check_and_expand_radius(
    request: Request,
    db: Session,
    force_expand: bool = False,
    declined_donor_ids: Optional[Set[int]] = None,
) -> Tuple[bool, float, int]:
    """
    Serverless-compatible radius auto-expansion logic (FR 1.3.3, FR 1.3.4):
    - Configurable radius progression: +5 km per cycle (up to 2 expansion cycles).
    - Condition A: Fewer than 5 eligible donors found within current radius.
    - Condition B: Rare blood group (O-, AB-) bypasses wait window and expands immediately.
    - Condition C: Wait window (>= 5 minutes without acceptance) has elapsed.
    Returns: (was_expanded: bool, current_radius_km: float, expansion_count: int).
    """
    # Auto-expansion applies only while active and searching (not matched/fulfilled/cancelled)
    if request.status in ["matched", "fulfilled", "cancelled"]:
        return (False, request.search_radius_km, request.expansion_count)

    # Maximum 2 expansion cycles per FR 1.3.3
    if request.expansion_count >= 2:
        return (False, request.search_radius_km, request.expansion_count)

    # Check eligible donor count in current radius
    current_matches = find_eligible_donors_in_radius(
        db=db,
        hospital_lat=request.hospital_latitude,
        hospital_lon=request.hospital_longitude,
        blood_group=request.blood_group,
        radius_km=request.search_radius_km,
        declined_donor_ids=declined_donor_ids,
    )

    eligible_non_declined_count = sum(1 for m in current_matches if not m["is_declined"])

    # Evaluate expansion triggers
    should_expand = False

    if force_expand:
        should_expand = True
    elif is_rare_blood_group(request.blood_group) and eligible_non_declined_count < 5:
        # FR 1.3.4: Rare blood groups bypass wait window and expand immediately
        should_expand = True
    elif eligible_non_declined_count < 5:
        # FR 1.3.3: Fewer than minimum threshold of eligible donors (e.g. 5)
        should_expand = True
    else:
        # Check wait window (5 minutes without donor acceptance)
        req_time = request.updated_at or request.created_at
        if req_time:
            if req_time.tzinfo is None:
                req_time = req_time.replace(tzinfo=timezone.utc)
            now = datetime.now(timezone.utc)
            if (now - req_time).total_seconds() >= 300:
                should_expand = True

    if should_expand:
        new_radius = min(30.0, request.search_radius_km + 5.0)
        request.search_radius_km = new_radius
        request.expansion_count += 1
        db.commit()
        db.refresh(request)
        return (True, request.search_radius_km, request.expansion_count)

    return (False, request.search_radius_km, request.expansion_count)

