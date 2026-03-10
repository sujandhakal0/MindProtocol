from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from dotenv import load_dotenv

# Force-load .env before the lru_cache freezes Settings for the first time.
# Without this, if any module imported Settings at the top level during
# uvicorn startup (before the process env was fully populated), get_settings()
# would cache empty strings and never re-read the file.
load_dotenv(override=True)


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""

    # Supabase Dashboard -> Settings -> API -> JWT Settings -> JWT Secret (click Reveal)
    # Used to verify tokens locally — no extra API call on every request.
    supabase_jwt_secret: str = ""

    # Groq
    groq_api_key: str = ""

    # HuggingFace
    huggingface_api_key: str = ""

    # App
    app_name: str = "MindProtocol"
    debug: bool = False
    allowed_origins: list[str] = ["*"]

    # Rate limiting (placeholder)
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    """Call this in tests or after mutating .env at runtime."""
    get_settings.cache_clear()