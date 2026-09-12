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
    Base.metadata.create_all(bind=engine)
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

# Register Routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth")
app.include_router(awareness_router, prefix=f"{settings.API_V1_STR}/awareness")
app.include_router(map_router, prefix=f"{settings.API_V1_STR}/map")
app.include_router(feed_router, prefix=f"{settings.API_V1_STR}/feed")



from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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


@app.get("/", tags=["Root"])
async def root(request: Request):
    """Root endpoint providing index HTML for browsers and JSON navigation for API clients."""
    accept = request.headers.get("accept", "")
    index_file = pages_dir / "index.html"
    if "text/html" in accept and index_file.exists():
        return FileResponse(str(index_file))
    return {
        "message": "Welcome to QATRA Emergency Blood Response Platform API",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/health",
    }

