"""FastAPI application entrypoint for QATRA Emergency Blood Response Platform."""
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend directory is in python path for both root execution and backend directory execution
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent
root_dir = backend_dir.parent

for p in (str(backend_dir), str(root_dir)):
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.config import settings
from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.awareness import router as awareness_router
from app.routers.map import router as map_router
from app.routers.feed import router as feed_router


from app.core.database import engine
from app.models.base import Base
import app.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events (startup / shutdown)."""
    # Initialize DB schema for in-memory SQLite and testing environments
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        import logging
        logging.getLogger("qatra.startup").warning(
            f"Database schema auto-creation skipped: {e}"
        )
    yield
    # Shutdown logic: cleanup resources


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Emergency Blood Response Platform connecting verified seekers to eligible donors.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)


@app.get("/docs", include_in_schema=False)
async def redirect_docs():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"{settings.API_V1_STR}/docs")


from app.core.rate_limit import RateLimitMiddleware

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Rate Limiting Middleware (NFR 2.6 - Nimra Iftikhar)
app.add_middleware(RateLimitMiddleware)

# Register Routers across both /api and /api/v1 prefixes
for prefix in list(dict.fromkeys([settings.API_V1_STR, "/api", "/api/v1"])):
    app.include_router(health_router, prefix=prefix)
    app.include_router(auth_router, prefix=f"{prefix}/auth")
    app.include_router(awareness_router, prefix=f"{prefix}/awareness")
    app.include_router(map_router, prefix=f"{prefix}/map")
    app.include_router(feed_router, prefix=f"{prefix}/feed")
app.include_router(health_router, prefix="")



from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from starlette.requests import Request

frontend_dir = root_dir / "frontend"
static_dir = frontend_dir / "static"
pages_dir = frontend_dir / "pages"
media_dir = root_dir / "media"

if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

if media_dir.exists():
    app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")

if pages_dir.exists():
    seeker_dir = pages_dir / "seeker"
    donor_dir = pages_dir / "donor"
    admin_dir = pages_dir / "admin"

    if seeker_dir.exists():
        app.mount("/seeker", StaticFiles(directory=str(seeker_dir), html=True), name="seeker")
    if donor_dir.exists():
        app.mount("/donor", StaticFiles(directory=str(donor_dir), html=True), name="donor")
    if admin_dir.exists():
        app.mount("/admin", StaticFiles(directory=str(admin_dir), html=True), name="admin")


@app.get("/manifest.json", tags=["PWA"])
async def pwa_manifest():
    """Serve PWA Web App Manifest at root URL for mobile Chrome installation."""
    manifest_file = static_dir / "manifest.json"
    if manifest_file.exists():
        return FileResponse(str(manifest_file), media_type="application/manifest+json")
    return {"name": "QATRA Emergency Blood Response"}


@app.get("/sw.js", tags=["PWA"])
async def pwa_service_worker():
    """Serve Service Worker at root URL allowing root-scope progressive caching."""
    sw_file = static_dir / "sw.js"
    if sw_file.exists():
        return FileResponse(
            str(sw_file),
            media_type="application/javascript",
            headers={"Service-Worker-Allowed": "/"},
        )
    return ""


@app.get("/favicon.ico", include_in_schema=False)
async def favicon_ico():
    """Serve multi-resolution favicon.ico directly at root for browsers."""
    ico_file = static_dir / "icons" / "favicon.ico"
    if ico_file.exists():
        return FileResponse(str(ico_file), media_type="image/x-icon")
    png_file = static_dir / "icons" / "favicon.png"
    if png_file.exists():
        return FileResponse(str(png_file), media_type="image/png")
    return Response(status_code=204)


@app.get("/favicon.png", include_in_schema=False)
async def favicon_png():
    """Serve favicon.png directly at root."""
    png_file = static_dir / "icons" / "favicon.png"
    if png_file.exists():
        return FileResponse(str(png_file), media_type="image/png")
    return Response(status_code=204)


@app.get("/apple-touch-icon.png", include_in_schema=False)
@app.get("/apple-touch-icon-precomposed.png", include_in_schema=False)
async def apple_touch_icon():
    """Serve apple-touch-icon at root for iOS WebClip bookmarks."""
    ati_file = static_dir / "icons" / "apple-touch-icon.png"
    if ati_file.exists():
        return FileResponse(str(ati_file), media_type="image/png")
    return Response(status_code=204)


@app.get("/", tags=["Root"])
@app.get("/index.html", include_in_schema=False)
async def root(request: Request):
    """Root endpoint providing index HTML for browsers and JSON navigation for API clients."""
    index_file = pages_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {
        "message": "Welcome to QATRA Emergency Blood Response Platform API",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/health",
    }

