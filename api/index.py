"""Vercel serverless entrypoint for QATRA FastAPI backend."""
import sys
from pathlib import Path

# Set up system paths for serverless environment
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

for path in (str(backend_dir), str(root_dir)):
    if path not in sys.path:
        sys.path.insert(0, path)

from app.main import app

# Vercel's Python runtime requires the ASGI/WSGI instance exposed as 'app'
__all__ = ["app"]
