import logging
from datetime import datetime


def utc_now_iso() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.utcnow().isoformat() + "Z"


def combine_journal_answers(a1: str, a2: str, a3: str) -> str:
    """Combine journal answers into a single passage for embedding."""
    return f"{a1.strip()} {a2.strip()} {a3.strip()}"


def truncate(text: str, max_chars: int = 500) -> str:
    """Truncate text to max_chars, appending ellipsis if cut."""
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rstrip() + "…"


def setup_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
