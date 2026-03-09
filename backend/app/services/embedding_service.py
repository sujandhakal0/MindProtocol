import logging
import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)

HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
HF_API_BASE = "https://api-inference.huggingface.co/pipeline/feature-extraction"


async def generate_embedding(text: str) -> list[float]:
    """
    Generate a 384-dimensional text embedding via HuggingFace Inference API.
    Falls back to a zero vector on failure so the pipeline can continue.
    """
    settings = get_settings()
    url = f"{HF_API_BASE}/{HF_MODEL}"
    headers = {"Authorization": f"Bearer {settings.huggingface_api_key}"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json={"inputs": text})
            response.raise_for_status()
            data = response.json()

        # HF returns a nested list for batch; we pass a single string
        if isinstance(data, list) and isinstance(data[0], list):
            embedding = data[0]
        elif isinstance(data, list) and isinstance(data[0], float):
            embedding = data
        else:
            raise ValueError(f"Unexpected HF response shape: {type(data)}")

        logger.info(f"Embedding generated, dim={len(embedding)}")
        return embedding

    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        # Return zero vector to avoid crashing the entire pipeline
        return [0.0] * 384
