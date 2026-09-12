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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events (startup / shutdown)."""
    # Startup logic: DB connection checks, background services setup
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

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth")
app.include_router(awareness_router, prefix=f"{settings.API_V1_STR}/awareness")
app.include_router(map_router, prefix=f"{settings.API_V1_STR}/map")



@app.get("/", tags=["Root"])
async def root():
    """Root endpoint providing quick API navigation."""
    return {
        "message": "Welcome to QATRA Emergency Blood Response Platform API",
        "docs": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
