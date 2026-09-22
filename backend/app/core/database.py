"""Database session and connection engine for Supabase PostgreSQL with resilient fallback."""
import os
import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.core.config import settings

logger = logging.getLogger("qatra.database")

# Normalize Supabase connection string to use psycopg 3 driver (postgresql+psycopg://)
db_url = settings.DATABASE_URL

is_serverless = bool(os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"))
is_localhost = "localhost" in db_url or "127.0.0.1" in db_url

if is_serverless and is_localhost:
    logger.info("Serverless environment detected without external DB; using SQLite at /tmp/qatra.db")
    db_url = "sqlite:////tmp/qatra.db"
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine_kwargs = {"pool_pre_ping": True}
if db_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    if ":memory:" in db_url:
        engine_kwargs["poolclass"] = StaticPool
else:
    engine_kwargs["pool_recycle"] = 300

try:
    engine = create_engine(
        db_url,
        **engine_kwargs,
    )
    if not db_url.startswith("sqlite"):
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
except Exception as e:
    logger.warning(f"Database connection to {db_url} failed: {e}. Activating resilient SQLite fallback at /tmp/qatra.db")
    db_url = "sqlite:////tmp/qatra.db"
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
        pool_pre_ping=True
    )

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

_schema_initialized = False

def init_db_schema():
    """Ensure database schema is created on demand and RLS is secured."""
    global _schema_initialized
    if not _schema_initialized:
        try:
            from app.models.base import Base
            import app.models  # noqa: F401
            Base.metadata.create_all(bind=engine)

            # Enforce Row-Level Security on PostgreSQL public schema
            if not str(engine.url).startswith("sqlite"):
                with engine.begin() as conn:
                    for table_name in Base.metadata.tables.keys():
                        try:
                            conn.execute(text(f'ALTER TABLE "{table_name}" ENABLE ROW LEVEL SECURITY;'))
                        except Exception:
                            pass

            _schema_initialized = True
        except Exception as e:
            logger.warning(f"Schema creation error: {e}")


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a database session per request.
    Automatically closes session upon request completion.
    """
    init_db_schema()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
