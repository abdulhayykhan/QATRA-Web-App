"""System Health Diagnostics and Fallback Resilience Router (NFR 1.4).

Owner: Nimra Iftikhar
Monitors database connectivity, cache engine, storage readiness, and reports graceful
fallback status (feed-only mode if map services degrade per PRD Section 7.2 & 7.6).
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Depends, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.config import settings
from app.core.database import get_db
from app.services.cache import cache

logger = logging.getLogger("qatra.health")

router = APIRouter(prefix="/health", tags=["Health & Resilience"])


@router.get("", summary="System Health & Fallback Resilience Diagnostics (NFR 1.4)")
def health_check(
    response: Response,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Performs live health checks across core dependencies:
    1. Database connection pool (PostgreSQL / Supabase).
    2. In-memory / TTL Cache Engine (NFR 1.3).
    3. Graceful Fallback Mode detection (switches to feed-only mode if geo services struggle).
    """
    dependencies = {}
    is_fully_healthy = True
    fallback_mode = False

    # 1. Database Connectivity Check
    try:
        db.execute(text("SELECT 1"))
        dependencies["database"] = {
            "status": "connected",
            "type": "Supabase PostgreSQL",
        }
    except Exception as e:
        logger.error(f"Health check DB error: {str(e)}")
        dependencies["database"] = {
            "status": "unreachable",
            "error": str(e),
        }
        is_fully_healthy = False
        fallback_mode = True

    # 2. Caching Engine Check (NFR 1.3)
    try:
        stats = cache.get_stats()
        dependencies["cache"] = {
            "status": "operational",
            "active_keys": stats["active_keys"],
            "hit_ratio": stats["hit_ratio"],
        }
    except Exception as e:
        dependencies["cache"] = {
            "status": "degraded",
            "error": str(e),
        }

    # 3. Storage Vault Status
    has_storage_config = bool(settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY)
    dependencies["storage"] = {
        "status": "configured" if has_storage_config else "unconfigured",
        "provider": "Supabase Storage Vault",
    }

    # Overall system status
    overall_status = "healthy" if is_fully_healthy else "degraded"
    if not is_fully_healthy:
        response.status_code = status.HTTP_200_OK  # keep 200 so load balancer routes to feed fallback

    return {
        "status": overall_status,
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fallback_mode": fallback_mode,
        "feed_only_mode": fallback_mode,
        "dependencies": dependencies,
    }
