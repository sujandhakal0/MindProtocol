from supabase import create_client, Client
import logging

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_supabase_client(url: str, key: str) -> Client:
    """
    Return a singleton Supabase client, initialised with the service_role key.

    IMPORTANT — which key to use:
      service_role key → bypasses Row Level Security → correct for backend use
      anon key         → subject to RLS policies     → correct for client/mobile use only

    If you see RLS errors (code 42501) it almost always means the anon key
    was used here instead of service_role. Check your .env:

        SUPABASE_KEY=eyJhbGc...    ← must be the service_role value, not anon
    """
    global _client
    if _client is None:
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_KEY must be set in environment variables."
            )

        # Warn loudly if the key looks like it might be the anon key.
        # Both keys are JWTs — the role claim inside distinguishes them.
        _warn_if_anon_key(key)

        _client = create_client(url, key)
        logger.info("Supabase client initialised.")
    return _client


def _warn_if_anon_key(key: str) -> None:
    """
    Decode the key JWT (no verification needed — we just read the payload)
    and warn if the role is 'anon' instead of 'service_role'.
    """
    try:
        import base64, json
        parts = key.split(".")
        if len(parts) != 3:
            return
        payload_b64 = parts[1] + "=" * (4 - len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        role = payload.get("role", "")
        if role == "anon":
            logger.error(
                "\n"
                "╔══════════════════════════════════════════════════════════════╗\n"
                "║  WRONG SUPABASE KEY — using 'anon' instead of 'service_role' ║\n"
                "╠══════════════════════════════════════════════════════════════╣\n"
                "║  The anon key is subject to Row Level Security (RLS).        ║\n"
                "║  The backend needs the service_role key to bypass RLS.       ║\n"
                "║                                                              ║\n"
                "║  Fix: Supabase Dashboard → Settings → API →                  ║\n"
                "║       Project API Keys → service_role → Reveal → Copy        ║\n"
                "║       Then update SUPABASE_KEY in your .env file.            ║\n"
                "╚══════════════════════════════════════════════════════════════╝"
            )
        elif role == "service_role":
            logger.info("Supabase key verified: service_role ✓")
    except Exception:
        pass  # Non-fatal — key format may differ, just skip the check