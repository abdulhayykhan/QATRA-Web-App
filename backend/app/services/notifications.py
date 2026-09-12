"""Shared notification dispatch service for emergency proximity alerts and rare blood group broadcasts.

Shared between:
- Feature 1 (Live Map & Proximity Matching: Hareem Israr)
- Feature 3 (Urgent Request Feed: Mahrukh Baig)
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import logging

from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.schemas.enums import NotificationType

logger = logging.getLogger("qatra.notifications")

RARE_BLOOD_GROUPS = {"O-", "AB-", "B-", "A-"}


async def dispatch_blood_alert(
    request_id: int,
    blood_group: str,
    hospital_name: str,
    hospital_lat: float,
    hospital_lon: float,
    urgency: str,
    is_rare: bool = False,
    target_donor_ids: Optional[List[int]] = None,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Shared dispatch engine:
    1. Map Integration (Hareem): Dispatches targeted proximity push alerts to ranked donors within geo-fence radius.
    2. Feed Integration (Mahrukh): Triggers immediate high-priority alerts for rare blood groups (e.g. O-, AB-).
    """
    clean_group = blood_group.strip().upper() if blood_group else ""
    actual_is_rare = is_rare or (clean_group in RARE_BLOOD_GROUPS)

    urgency_label = "within 2 hours" if "2" in urgency else "within 24 hours"

    logger.info(
        f"[Notification Service] Dispatching alert for request #{request_id} "
        f"({clean_group}, Urgency: {urgency}, Rare: {actual_is_rare}) at {hospital_name}"
    )

    alert_count = len(target_donor_ids) if target_donor_ids else 0

    if db is not None and target_donor_ids:
        if actual_is_rare:
            title = f"🚨 URGENT RARE BLOOD ALERT: {clean_group} Needed!"
            notif_type = NotificationType.RARE_BLOOD_ALERT.value
            msg = (
                f"HIGH PRIORITY: Rare blood group {clean_group} is urgently required for a patient "
                f"at {hospital_name} ({urgency_label}). Please respond immediately if eligible."
            )
        else:
            title = f"🩸 Emergency Blood Needed: {clean_group}"
            notif_type = NotificationType.PROXIMITY_ALERT.value
            msg = (
                f"Emergency blood request for {clean_group} needed at {hospital_name} ({urgency_label}). "
                f"Please review and respond if you can donate."
            )

        now = datetime.now(timezone.utc)
        for donor_user_id in target_donor_ids:
            notif = Notification(
                user_id=donor_user_id,
                request_id=request_id,
                title=title,
                message=msg,
                notification_type=notif_type,
                is_read=False,
                sent_at=now,
            )
            db.add(notif)

        db.commit()

    return {
        "request_id": request_id,
        "blood_group": clean_group,
        "is_rare": actual_is_rare,
        "donors_alerted_count": alert_count,
        "status": "dispatched",
    }
