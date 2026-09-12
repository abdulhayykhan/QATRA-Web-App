"""Pytest configuration and global test fixtures for QATRA backend test suite."""
import pytest
from app.core.database import engine
from app.core.rate_limit import limiter
from app.models.base import Base
import app.models  # noqa: F401 - Register all models with Base.metadata


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Ensure all database tables are created before running the test suite."""
    Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture(autouse=True)
def reset_rate_limiter_before_each_test():
    """Reset the sliding window rate limiter before every single test.
    
    Prevents 429 Too Many Requests errors from accumulating across test files
    when multiple tests hit protected endpoints (e.g. /api/auth/firebase-login).
    """
    limiter.clear()
    limiter.enabled = True
    yield
    limiter.clear()
