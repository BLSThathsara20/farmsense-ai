from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "FarmSense AI API"
    app_version: str = "1.0.0"
    environment: str = "development"
    debug: bool = False

    database_url: str = "postgresql+psycopg://postgres:farmsense@localhost:5432/farmsense"
    db_pool_size: int = 10
    db_max_overflow: int = 20
    db_pool_recycle: int = 1800

    jwt_secret: str = "farmsense-dev-secret-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    # Reserved super-admin email — first register sets password; later visits use login
    super_admin_email: str = "blsthathsara@gmail.com"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    ml_artifacts_dir: Path | None = None
    ml_model_filename: str = "rf_suitability.pkl"
    # Heavy mode: run L2/L3 LSTM (TensorFlow). Set ML_HEAVY=false for light fallback.
    ml_heavy: bool = True

    cache_ttl_seconds: int = 60
    idempotency_ttl_hours: int = 24

    rate_limit_default: str = "120/minute"

    oversupply_threshold: int = 100

    # Email (Resend free tier — https://resend.com)
    resend_api_key: str = ""
    email_from: str = "FarmSense AI <onboarding@resend.dev>"
    frontend_url: str = "http://localhost:5173"
    password_reset_expire_minutes: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def resolved_ml_artifacts_dir(self) -> Path:
        if self.ml_artifacts_dir:
            return self.ml_artifacts_dir
        here = Path(__file__).resolve()
        candidates = [
            here.parents[2] / "ml-models" / "artifacts",  # Docker: /app/ml-models/artifacts
            here.parents[3] / "ml-models" / "artifacts",  # Local: farmsense-ai/ml-models/artifacts
        ]
        for path in candidates:
            if path.exists():
                return path
        return candidates[1]

    @property
    def ml_model_path(self) -> Path:
        return self.resolved_ml_artifacts_dir / self.ml_model_filename


@lru_cache
def get_settings() -> Settings:
    return Settings()
