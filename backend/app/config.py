from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""

    # Groq
    groq_api_key: str = ""

    # HuggingFace
    huggingface_api_key: str = ""

    # App
    app_name: str = "MindProtocol"
    debug: bool = False
    allowed_origins: list[str] = ["*"]

    # Rate limiting (placeholder values)
    rate_limit_requests: int = 100
    rate_limit_window: int = 60  # seconds

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
