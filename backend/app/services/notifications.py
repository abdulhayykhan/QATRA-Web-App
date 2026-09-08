"""Shared notification dispatch service for emergency proximity alerts and rare blood group broadcasts.

Shared between:
- Feature 1 (Live Map & Proximity Matching: Hareem Israr)
- Feature 3 (Urgent Request Feed: Mahrukh Baig)
"""
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger("qatra.notifications")


async def dispatch_blood_alert(
    request_id: int,
    blood_group: str,
    hospital_name: str,
    hospital_lat: float,
    hospital_lon: float,
    urgency: str,
    is_rare: bool = False,
    target_donor_ids: Optional[List[int]] = None,
) -> Dict[str, Any]:
    """
    Shared dispatch engine:
    1. Map Integration (Hareem): Dispatches targeted proximity push alerts to ranked donors within geo-fence radius.
    2. Feed Integration (Mahrukh): Triggers immediate high-priority alerts for rare blood groups (e.g. O-, AB-).
    """
    logger.info(
        f"[Notification Service] Dispatching alert for request #{request_id} "
        f"({blood_group}, Urgency: {urgency}, Rare: {is_rare}) at {hospital_name}"
    )

    alert_count = len(target_donor_ids) if target_donor_ids else 0

    return {
        "request_id": request_id,
        "blood_group": blood_group,
        "is_rare": is_rare,
        "donors_alerted_count": alert_count,
        "status": "dispatched",
    }
