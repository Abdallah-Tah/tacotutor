"""
TacoTutor Backend - Core configuration.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    # App
    APP_NAME: str = "TacoTutor"
    DEBUG: bool = os.environ.get("DEBUG", "false").lower() == "true"
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "tacotutor-secret-key-change-me")

    # Database (PostgreSQL for prod)
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "postgresql://tacotutor:tacotutor@localhost:5432/tacotutor"
    )

    # Auth
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    GOOGLE_CLIENT_ID: str = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.environ.get("GOOGLE_CLIENT_SECRET", "")

    # API Keys (keep existing env vars)
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")
    OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.environ.get("ANTHROPIC_API_KEY", "")

    # CORS
    CORS_ORIGINS: list[str] = ["*"]

    class Config:
        env_file = str(REPO_ROOT / ".env")


settings = Settings()
