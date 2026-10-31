import os
import sys
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BACKEND_DIR / "brightloop.db"

class Settings(BaseSettings):
    PROJECT_NAME: str = "Brightloop Subscription Management"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # In production, require setting SECRET_KEY via environment variable
    SECRET_KEY: str = os.getenv("SECRET_KEY", "brightloop-super-secure-production-ready-jwt-secret-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH.as_posix()}")
    
    # Restrict allowed origins for CORS security
    CORS_ORIGINS: list[str] = [
        origin.strip() for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
        ).split(",") if origin.strip()
    ]
    
    DEFAULT_CURRENCY: str = "USD"

    model_config = SettingsConfigDict(extra="ignore")

settings = Settings()

if settings.ENVIRONMENT == "production" and settings.SECRET_KEY == "brightloop-super-secure-production-ready-jwt-secret-key-2026":
    print("WARNING: Using default SECRET_KEY in production! Set SECRET_KEY in environment variables.", file=sys.stderr)

