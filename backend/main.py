"""
main.py
--------
MindProtocol FastAPI application entry point.

To run locally:
    uvicorn main:app --reload --port 8000

To run on Railway (production):
    uvicorn main:app --host 0.0.0.0 --port $PORT

Interactive API docs (development only):
    http://localhost:8000/docs   ← Swagger UI
    http://localhost:8000/redoc  ← ReDoc

Owner: Nishant
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import auth, morning, evening, weekly
from services.supabase_client import supabase_admin

load_dotenv()


# ── Startup / Shutdown ─────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once on startup to verify the Supabase connection is healthy.
    If this fails, the server still starts — it just logs a warning.
    """
    print("🧠 MindProtocol API starting up...")
    try:
        # Simple connectivity test — count rows in profiles (RLS-safe)
        supabase_admin.table("profiles").select("id", count="exact").limit(1).execute()
        print("✅ Supabase connection: OK")
    except Exception as e:
        print(f"⚠️  Supabase connection check failed: {e}")
        print("   Server will start anyway — check your .env credentials.")

    yield  # App runs here

    print("🧠 MindProtocol API shutting down.")


# ── App Initialization ─────────────────────────────────────

app = FastAPI(
    title="MindProtocol API",
    version="1.0.0",
    description=(
        "Backend API for MindProtocol — a science-backed daily mental health "
        "companion. Nepal-US Hackathon 2026.\n\n"
        "**Owner:** Nishant (Backend, Database & ML Logic)\n"
        "**Stack:** FastAPI + Supabase + Groq (llama-3.3-70b)"
    ),
    lifespan=lifespan,
    # Disable docs in production to avoid exposing the API surface
    docs_url="/docs" if os.getenv("APP_ENV") != "production" else None,
    redoc_url="/redoc" if os.getenv("APP_ENV") != "production" else None,
)


# ── CORS ───────────────────────────────────────────────────
# Bidhur: add your Expo dev URL to ALLOWED_ORIGINS in .env

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:19006")
allowed_origins = [origin.strip() for origin in _raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ────────────────────────────────────────────────

app.include_router(auth.router,    prefix="")           # /auth/register, /auth/login
app.include_router(morning.router, prefix="")           # /morning-checkin
app.include_router(evening.router, prefix="")           # /evening-response
app.include_router(weekly.router,  prefix="")           # /weekly-summary


# ── Health Check ───────────────────────────────────────────

@app.get("/", tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    Railway uses this to confirm the app is live after deployment.
    Bidhur: ping this first to confirm the backend URL is reachable.
    """
    return {"status": "ok", "project": "MindProtocol"}
