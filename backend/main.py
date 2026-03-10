# backend/main.py
# MindProtocol FastAPI Backend — Entry Point

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from ai.groq_client import call_groq

app = FastAPI(
    title="MindProtocol API",
    description="Backend for MindProtocol — Nepal-US Hackathon 2026",
    version="1.0.0"
)

# CORS — allows the React Native frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    """Quick check that the server is running."""
    return {"status": "ok", "project": "MindProtocol"}


@app.get("/test-ai")
def test_ai():
    """
    TEMPORARY ENDPOINT — only for confirming Groq API works.
    Remove before final demo.
    """
    try:
        system_prompt = """You are a calm, thoughtful mental health companion 
        called MindProtocol. You help users reflect on their day using 
        science-backed techniques. You are warm, human, and never clinical."""

        user_message = """Say hello to the MindProtocol team and share 
        one simple grounding technique they can use when stressed."""

        response = call_groq(system_prompt, user_message, temperature=0.7)

        return {
            "status": "success",
            "model": "llama-3.3-70b-versatile",
            "response": response
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))