"""
services/supabase_client.py
---------------------------
Singleton Supabase client used across all routers.

Two clients are exposed:
  - supabase_anon   : uses ANON key — for user-authenticated requests
  - supabase_admin  : uses SERVICE_ROLE key — for server-side ops like
                      creating profiles, reading other users' data (avoid
                      unless necessary). Never expose this key to the frontend.
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY: str = os.environ["SUPABASE_ANON_KEY"]
SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def get_supabase_client() -> Client:
    """
    Returns a Supabase client initialized with the anon key.
    Used for all user-authenticated requests — RLS policies apply.
    """
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


def get_supabase_admin_client() -> Client:
    """
    Returns a Supabase client initialized with the service role key.
    BYPASSES Row Level Security — use only for trusted server-side ops.
    Never expose the service role key to the frontend.
    """
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# Singleton instances — import these directly in routers/services
supabase: Client = get_supabase_client()
supabase_admin: Client = get_supabase_admin_client()
