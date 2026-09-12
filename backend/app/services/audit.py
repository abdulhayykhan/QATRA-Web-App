"""Audit logging service for security, access tracking, and compliance (NFR 2.5)."""
from typing import Optional
from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def log_audit_event(
    db: Session,
    action: str,
    target_resource: str,
    target_id: Optional[str] = None,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    details: Optional[str] = None,
) -> AuditLog:
    """
    Persist an audit log entry tracking access or modifications to sensitive data
    (CNIC submissions, hospital slip reviews, health checklists, admin escalations).
    """
    log_entry = AuditLog(
        user_id=user_id,
        action=action,
        target_resource=target_resource,
        target_id=str(target_id) if target_id is not None else None,
        ip_address=ip_address,
        details=details,
    )
    db.add(log_entry)
    try:
        db.commit()
        db.refresh(log_entry)
    except Exception:
        db.rollback()
    return log_entry


def query_audit_logs(
    db: Session,
    action: Optional[str] = None,
    target_resource: Optional[str] = None,
    user_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[int, list[AuditLog]]:
    """
    Query audit log trail with optional filtering and pagination (NFR 2.5).
    Returns (total_count, list_of_logs).
    """
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action == action)
    if target_resource:
        query = query.filter(AuditLog.target_resource == target_resource)
    if user_id is not None:
        query = query.filter(AuditLog.user_id == user_id)

    total = query.count()
    items = query.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()
    return total, items

