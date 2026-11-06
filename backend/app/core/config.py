"""Explicit environment configuration. Production never silently uses test credentials."""

from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_env: str = "local"
    testing: bool = False
    test_database_url: str = ""
    database_url: str = (
        "postgresql+psycopg://wk:local-only@localhost:55439/wk_select_new"
    )
    local_allowed_origins: str = ""
    public_origin: str = "http://localhost:8089"
    session_secret: str = ""
    google_client_id: str = ""
    google_client_secret: str = ""
    storage_backend: str = "local"
    upload_dir: str = "/app/uploads"
    r2_endpoint_url: str = ""
    r2_bucket: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    seed_dir: str = "/app/data"
    ecpay_order_testing_enabled: bool = False
    ecpay_sandbox_enabled: bool = False
    ecpay_sandbox_callback_origin: str = ""
    session_hours: int = 8

    @property
    def secure_cookie(self):
        return self.public_origin.startswith("https://")


@lru_cache
def settings():
    import os

    fields = Settings.model_fields
    overrides = {}
    for field in fields:
        secret_path = os.getenv(field.upper() + "_FILE")
        if secret_path:
            overrides[field] = Path(secret_path).read_text().strip()
    value = Settings(**overrides)
    if len(value.session_secret) < 32:
        raise RuntimeError("SESSION_SECRET must contain at least 32 random characters")
    if value.app_env == "production" and (
        not value.secure_cookie or value.storage_backend != "r2"
    ):
        raise RuntimeError(
            "Production requires HTTPS PUBLIC_ORIGIN and STORAGE_BACKEND=r2"
        )
    return value
