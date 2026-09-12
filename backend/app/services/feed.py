"""Social & Urgent Request Feed service layer (FR 3.4, PRD Section 5).

Owner: Mahrukh Baig
Provides request lifecycle management, automated fulfillment checks, and auto-close logic.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.request import Request
from app.models.notification import Notification
from app.schemas.enums import NotificationType
from app.services.audit import log_audit_event

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
