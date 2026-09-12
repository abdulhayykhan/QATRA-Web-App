"""Social & Urgent Request Feed service layer (FR 3.4, PRD Section 5).

Owner: Mahrukh Baig
Provides request lifecycle management, automated fulfillment checks, auto-close logic,
and notification trigger logic for rare vs common blood groups (Sec 5.3, Contract 5.6).
"""
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from sqlalchemy.orm import Session

from app.models.request import Request
from app.models.donor import Donor
from app.models.notification import Notification
from app.schemas.enums import NotificationType
from app.services.audit import log_audit_event
from app.services.cooldown import is_donor_eligible_for_dispatch
from app.services.geo import (
    is_rare_blood_group,
    get_compatible_donor_groups,
    haversine_distance_km,
)
from app.services.notifications import dispatch_blood_alert

logger = logging.getLogger("qatra.feed.service")


def check_and_auto_close_request(request: Request, db: Session) -> bool:
    """
    Automatic Request Auto-Close Engine (FR 3.4):
    Whenever recorded donations meet the requirement (units_fulfilled >= units_needed),
    the internal backend service automatically transitions the request status to 'fulfilled'.

    Returns True if auto-closed, False otherwise.
    """
    if request.units_fulfilled >= request.units_needed and request.status != "fulfilled":
        old_status = request.status
        request.status = "fulfilled"

        logger.info(
            f"[Auto-Close Engine] Request #{request.id} fulfilled "
            f"({request.units_fulfilled}/{request.units_needed} units). Transitioning from {old_status} to fulfilled."
        )

        # Log compliance audit event
        log_audit_event(
            db=db,
            action="AUTO_CLOSE_REQUEST_FULFILLED",
            target_resource="requests",
            target_id=str(request.id),
            user_id=request.seeker_id,
            details=(
                f"Auto-closed request {request.id}: units fulfilled "
                f"({request.units_fulfilled}/{request.units_needed}) from status {old_status}"
            ),
        )

        # Notify seeker
        seeker_notif = Notification(
            user_id=request.seeker_id,
            request_id=request.id,
            title="Blood Request Fulfilled",
            message=(
                f"All {request.units_needed} required blood unit(s) for {request.patient_name} "
                f"at {request.hospital_name} have been fulfilled! Your request is now closed."
            ),
            notification_type=NotificationType.SYSTEM.value,
            is_read=False,
            sent_at=datetime.now(timezone.utc),
        )
        db.add(seeker_notif)

        # Notify alerted donors that request is now fulfilled
        donor_notifications = (
            db.query(Notification)
            .filter(
                Notification.request_id == request.id,
                Notification.user_id != request.seeker_id,
            )
            .all()
        )
        alerted_user_ids = {n.user_id for n in donor_notifications}
        for user_id in alerted_user_ids:
            db.add(
                Notification(
                    user_id=user_id,
                    request_id=request.id,
                    title="Request Fulfilled",
                    message=(
                        f"The emergency blood request for {request.patient_name} at "
                        f"{request.hospital_name} ({request.blood_group}) has been fulfilled. Thank you!"
                    ),
                    notification_type=NotificationType.SYSTEM.value,
                    is_read=False,
                    sent_at=datetime.now(timezone.utc),
                )
            )

        db.commit()
        db.refresh(request)
        return True

    return False


def record_donation_fulfillment(
    request_id: int,
    units_donated: int,
    db: Session,
) -> Optional[Request]:
    """
    Increments units_fulfilled on a request and triggers the auto-close engine (FR 3.4).
    """
    req = db.query(Request).filter(Request.id == request_id).first()
    if not req:
        return None

    req.units_fulfilled = min(req.units_needed, req.units_fulfilled + units_donated)
    check_and_auto_close_request(req, db)
    db.commit()
    db.refresh(req)
    return req


async def trigger_feed_blood_alert(
    request: Request,
    db: Session,
) -> Dict[str, Any]:
    """
    Notification trigger logic for rare vs common blood groups (PRD Sec 5.3, Contract Sec 5.6):
    - Rare blood groups (O-, AB-, B-, A-): triggers immediate high-priority broadcast across all eligible donors.
    - Common blood groups: standard proximity-calibrated alert dispatch within search radius.
    """
    is_rare = is_rare_blood_group(request.blood_group)
    compatible_groups = get_compatible_donor_groups(request.blood_group)

    # Query candidate donors matching compatible blood groups
    candidate_donors = (
        db.query(Donor)
        .filter(
            Donor.blood_group.in_(compatible_groups),
            Donor.is_available.is_(True),
            Donor.pre_screening_passed.is_(True),
        )
        .all()
    )

    # Filter through eligibility & cooldown engine (FR 2.4, FR 2.5)
    eligible_donors = [d for d in candidate_donors if is_donor_eligible_for_dispatch(d)]

    target_donor_ids: List[int] = []
    if is_rare:
        # Rare blood types: bypass wait window & alert all compatible eligible donors immediately (Sec 5.3)
        target_donor_ids = [d.user_id for d in eligible_donors if d.user_id != request.seeker_id]
    else:
        # Common blood types: filter by proximity radius (or take closest donors if coordinates exist)
        for d in eligible_donors:
            if d.user_id == request.seeker_id:
                continue
            if d.latitude is not None and d.longitude is not None:
                dist = haversine_distance_km(
                    d.latitude, d.longitude,
                    request.hospital_latitude, request.hospital_longitude,
                )
                if dist <= request.search_radius_km:
                    target_donor_ids.append(d.user_id)
            else:
                target_donor_ids.append(d.user_id)

    # Dispatch alerts through shared notifications engine (Contract 5.6)
    result = await dispatch_blood_alert(
        request_id=request.id,
        blood_group=request.blood_group,
        hospital_name=request.hospital_name,
        hospital_lat=request.hospital_latitude,
        hospital_lon=request.hospital_longitude,
        urgency=request.urgency,
        is_rare=is_rare,
        target_donor_ids=target_donor_ids,
        db=db,
    )

    # Log compliance audit event
    log_audit_event(
        db=db,
        action="DISPATCH_BLOOD_ALERT",
        target_resource="requests",
        target_id=str(request.id),
        user_id=request.seeker_id,
        details=(
            f"Alert dispatched for {request.blood_group} (Rare={is_rare}) to "
            f"{len(target_donor_ids)} eligible donors"
        ),
    )

    return result
