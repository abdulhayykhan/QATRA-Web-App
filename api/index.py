"""Vercel serverless entrypoint for QATRA FastAPI backend."""
import sys
import traceback
from pathlib import Path

# Set up system paths for serverless environment
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

for path in (str(backend_dir), str(root_dir)):
    if path not in sys.path:
        sys.path.insert(0, path)

app = None

try:
    from app.main import app as _real_app
    app = _real_app
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    _diag_app = FastAPI(title="QATRA Diagnostic Fallback")
    err_tb = traceback.format_exc()

    @_diag_app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def catch_all(path_name: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "Serverless Startup Failure",
                "details": str(e),
                "traceback": err_tb,
                "sys_path": sys.path[:5],
            },
        )
    app = _diag_app

# Vercel's Python runtime requires the ASGI/WSGI instance exposed as 'app'
__all__ = ["app"]
