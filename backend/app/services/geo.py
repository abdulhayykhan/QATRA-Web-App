"""Proximity query service, Haversine spatial math, and compatibility engine (FR 1.3, FR 1.4).

Owner: Hareem Israr (Feature 1: Live Map Integration & Proximity Matching)
"""
import math
from datetime import datetime, timezone
from typing import Tuple, List, Optional, Dict, Any

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
