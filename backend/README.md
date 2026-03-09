# 🧠 MindProtocol — Backend API

> A production-ready FastAPI backend for MindProtocol, a daily mental health companion app powered by AI-driven reflection and cognitive reframing.

---

## Architecture Overview

```
Morning Check-In → State Classifier → AI Question Generator
                                              ↓
                                    Evening Journal Submission
                                              ↓
                           Embedding → pgvector → RAG Retrieval
                                              ↓
                                    Groq LLM (Llama 3.3 70B)
                                              ↓
                                    Cognitive Reframe Response
```

---

## Quick Start

### 1. Prerequisites

- Python 3.11+
- A [Supabase](https://supabase.com) project
- A [Groq](https://console.groq.com) API key
- A [HuggingFace](https://huggingface.co/settings/tokens) access token

---

### 2. Clone & Install

```bash
git clone <your-repo-url>
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate    # macOS/Linux
# venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt
```

---

### 3. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in all values:

| Variable              | Description                              |
|-----------------------|------------------------------------------|
| `SUPABASE_URL`        | Your Supabase project URL                |
| `SUPABASE_KEY`        | Your Supabase anon or service role key   |
| `GROQ_API_KEY`        | Groq API key (for Llama 3.3 70B)        |
| `HUGGINGFACE_API_KEY` | HuggingFace token (for embeddings)       |
| `DEBUG`               | `true` / `false`                         |
| `ALLOWED_ORIGINS`     | JSON list of allowed CORS origins        |

---

### 4. Database Setup

1. Open your Supabase project → **SQL Editor**
2. Paste and run the full contents of `schema.sql`
3. This creates all tables, indexes, and the `match_journal_embeddings` RPC function

---

### 5. Run the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

---

## API Documentation

Once the server is running, visit:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## API Endpoints

### `POST /api/morning-checkin`

Record a user's morning brain scan and receive personalised evening questions.

**Request Body:**
```json
{
  "user_id": "uuid",
  "sleep_score": 6,
  "mood_score": 4,
  "stress_score": 8,
  "exercise": false,
  "morning_text": "Woke up anxious about the week ahead."
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "state_flag": "HIGH_REACTIVITY",
  "evening_questions": [
    "What moment today surprised you, even slightly?",
    "How did your body signal stress, and what did you do in response?",
    "What is one boundary you could set for yourself tomorrow?"
  ]
}
```

---

### `POST /api/evening-response`

Submit evening journal answers and receive a cognitive reframe.

**Request Body:**
```json
{
  "session_id": "uuid",
  "answer_1": "I felt overwhelmed in the morning but found calm after lunch.",
  "answer_2": "A walk outside helped me reset.",
  "answer_3": "Tomorrow I want to start with meditation."
}
```

**Response:**
```json
{
  "reflection": "You showed real self-awareness today by noticing the shift...",
  "reframe": "The fact that you found calm after lunch suggests your nervous system...",
  "micro_action": "Before sleep tonight, write down one thing you handled well today.",
  "crisis_detected": false
}
```

**Crisis Response** (if crisis keywords detected):
```json
{
  "reflection": "I noticed something in what you shared that concerns me...",
  "reframe": "CRISIS_DETECTED",
  "micro_action": "Please reach out to a crisis line right now.",
  "crisis_detected": true,
  "support_message": "...",
  "help_resources": ["988 Suicide & Crisis Lifeline (US): Call or text 988", "..."]
}
```

---

### `GET /api/weekly-summary/{user_id}`

Generate a weekly mental health trend summary.

**Response:**
```json
{
  "mood_trend": "improving",
  "stress_trend": "declining",
  "sleep_trend": "stable",
  "weekly_summary": "This week you showed consistent improvement in mood...",
  "sessions_analyzed": 7
}
```

---

## Mental State Classification

The rule-based classifier maps morning scores to a state flag:

| State Flag             | Condition                                     |
|------------------------|-----------------------------------------------|
| `HIGH_REACTIVITY`      | stress ≥ 7 AND mood ≤ 4                      |
| `PHYSICAL_DEPLETION`   | sleep ≤ 3                                    |
| `LOW_BASELINE`         | mood ≤ 3                                     |
| `ANXIOUS_BUT_FUNCTIONAL` | stress ≥ 6 AND mood ≥ 5                   |
| `STABLE`               | Everything else                              |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py               # FastAPI app factory + global handlers
│   ├── config.py             # Pydantic settings (env vars)
│   ├── dependencies.py       # FastAPI dependency injection
│   ├── api/
│   │   ├── router.py         # Central API router
│   │   ├── morning_routes.py # POST /api/morning-checkin
│   │   ├── evening_routes.py # POST /api/evening-response
│   │   └── weekly_routes.py  # GET  /api/weekly-summary/{user_id}
│   ├── models/
│   │   ├── request_models.py # Pydantic input models
│   │   └── response_models.py# Pydantic output models
│   ├── services/
│   │   ├── classification_service.py  # Rule-based mental state classifier
│   │   ├── ai_service.py              # Groq LLM integration
│   │   ├── embedding_service.py       # HuggingFace embeddings
│   │   └── trend_service.py           # Weekly trend calculation
│   ├── db/
│   │   ├── supabase_client.py # Singleton Supabase client
│   │   └── repositories.py    # Data access layer
│   ├── rag/
│   │   ├── vector_store.py    # pgvector storage wrapper
│   │   └── retriever.py       # Semantic similarity retriever
│   ├── prompts/
│   │   ├── question_prompt.py # Evening question prompt templates
│   │   ├── reframe_prompt.py  # Cognitive reframe + crisis detection
│   │   └── weekly_prompt.py   # Weekly summary prompt templates
│   └── utils/
│       └── helpers.py         # Shared utility functions
├── schema.sql         # Supabase database schema + pgvector setup
├── requirements.txt
├── .env.example
├── Dockerfile
└── README.md
```

---

## Deployment

### Docker

```bash
docker build -t mindprotocol-backend .
docker run -p 8000:8000 --env-file .env mindprotocol-backend
```

### Railway

1. Push to GitHub
2. Connect repo to [Railway](https://railway.app)
3. Set environment variables in Railway dashboard
4. Railway auto-detects the `Dockerfile` and deploys

---

## Security Notes

- **CORS**: Configure `ALLOWED_ORIGINS` in `.env` to restrict to your app's domain in production
- **Row Level Security**: The `schema.sql` includes commented-out RLS policies — enable them when integrating Supabase Auth
- **Rate Limiting**: A basic in-memory rate limiter is included; replace with Redis-backed solution for production
- **Service Role Key**: Use the anon key in client-facing contexts; the service role key only on the server

---

## Tech Stack

| Layer            | Technology                         |
|------------------|------------------------------------|
| Framework        | FastAPI + Uvicorn                  |
| Database         | Supabase (PostgreSQL)              |
| Vector Search    | pgvector                           |
| LLM              | Groq — Llama 3.3 70B              |
| Embeddings       | HuggingFace (all-MiniLM-L6-v2)    |
| AI Orchestration | LangChain                          |
| Config           | python-dotenv + pydantic-settings  |
| Deployment       | Docker / Railway                   |
