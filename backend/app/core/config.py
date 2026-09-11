"""Application configuration settings."""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global configuration settings for QATRA backend."""

    PROJECT_NAME: str = "QATRA Emergency Blood Response Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "e83a9d7f4b2c1e0a8f9b6d5c4a3b2e1f0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a"
    ENCRYPTION_KEY_AES256: str = ""

    # Database (Supabase Postgres)
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/qatra"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "https://*.vercel.app",
    ]

    # Firebase Authentication
    FIREBASE_PROJECT_ID: str = "qatra-web-app"
    FIREBASE_CLIENT_EMAIL: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    FIREBASE_CREDENTIALS_PATH: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
