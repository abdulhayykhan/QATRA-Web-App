"""Vercel serverless entrypoint for QATRA FastAPI backend."""
import sys
import traceback
from pathlib import Path

# Set up system paths for serverless environment
current_file = Path(__file__).resolve()
api_dir = current_file.parent
repo_root = api_dir.parent

candidate_paths = [
    repo_root / "backend",
    api_dir / "backend",
    repo_root,
    api_dir,
]

for p in candidate_paths:
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

app = None

try:
    from app.main import app as _real_app
    app = _real_app
    from app.core.database import init_db_schema
    init_db_schema()
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    err_msg = str(e)
    err_tb = traceback.format_exc()
    _diag_app = FastAPI(title="QATRA Diagnostic Fallback")

    @_diag_app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def catch_all(path_name: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Serverless Startup Failure",
                "details": err_msg,
                "traceback": err_tb,
                "sys_path": sys.path[:5],
            },
        )
    app = _diag_app

# Vercel's Python runtime requires the ASGI/WSGI instance exposed as 'app'
__all__ = ["app"]
