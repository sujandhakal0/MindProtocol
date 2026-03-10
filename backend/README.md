# 🧠 MindProtocol — Backend API

> Science-backed daily mental health companion | Nepal-US Hackathon 2026

MindProtocol helps users train their prefrontal cortex through a **2-minute morning brain scan** and a **5-minute AI-guided evening journal**, powered by Groq's LLaMA 3.3 70B and a RAG pipeline built on Supabase pgvector.

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Tech Stack](#-tech-stack)
- [Team](#-team)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [State Classification Logic](#-state-classification-logic)
- [Running Tests](#-running-tests)
- [Deployment](#-deployment)
- [Integration Contracts](#-integration-contracts)

---

## 🌟 Project Overview

MindProtocol's core loop runs in 4 steps every day:

```
Step 1 → Morning Brain Scan       (sliders: sleep, mood, stress)
Step 2 → Personalized Evening Journal  (3 AI-generated questions)
Step 3 → AI Reframe Response      (Groq LLaMA 3.3 70B)
Step 4 → Weekly Trend Dashboard   (7-day AI theme summary)
```

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | FastAPI (Python) | REST API — all endpoints |
| **Database** | Supabase (PostgreSQL) | User data, sessions, journal entries |
| **Auth** | Supabase Auth | JWT-based user authentication |
| **Vector DB** | Supabase pgvector | Journal embeddings for RAG |
| **LLM** | Groq API (llama-3.3-70b) | Question generation, reframe responses |
| **Embeddings** | HuggingFace Inference API | all-MiniLM-L6-v2 (384 dims) |
| **LLM Framework** | LangChain | RAG pipeline orchestration |
| **Hosting** | Railway.app | One-command deployment |

---

## 👥 Team

| Name | Role |
|---|---|
| **Sujan** | Lead · AI Integration · RAG Pipeline |
| **Nishant** | Backend · FastAPI · Supabase · ML Logic |
| **Saphal** | Prompt Engineering · QA Testing |
| **Danish** | Adaptive Engine · Frontend Support |
| **Bidhur** | Frontend (React Native / Expo) |

---

## 📁 Project Structure

```
mindprotocol-backend/
├── main.py                      # FastAPI app, CORS, router registration
├── requirements.txt
├── .env.example                 # Environment variable template
├── supabase_schema.sql          # Run once in Supabase SQL Editor
│
├── routers/
│   ├── auth.py                  # POST /auth/register, /auth/login, /auth/logout
│   ├── morning.py               # POST /morning-checkin
│   ├── evening.py               # POST /evening-response
│   └── weekly.py                # GET  /weekly-summary
│
├── models/
│   ├── morning.py               # Pydantic models for morning check-in
│   ├── evening.py               # Pydantic models for evening journal
│   └── weekly.py                # Pydantic models for weekly summary
│
├── services/
│   ├── supabase_client.py       # Supabase client singleton
│   ├── state_classifier.py      # ML logic: sliders → state flags
│   └── groq_client.py           # Groq API wrapper (Sujan fills prompts)
│
└── utils/
    └── auth_middleware.py       # JWT verification dependency
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- A [Supabase](https://supabase.com) project (free tier)
- A [Groq API key](https://console.groq.com) (free, no card)

### 1. Clone the repo

```bash
git clone https://github.com/<your-org>/mindprotocol.git
cd mindprotocol/mindprotocol-backend
```

### 2. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set up environment variables

```bash
cp .env.example .env
# Open .env and fill in your Supabase + Groq credentials
```

### 5. Set up the database

Open the [Supabase SQL Editor](https://supabase.com/dashboard) for your project, paste the entire contents of `supabase_schema.sql`, and click **Run**.

This creates all tables, enables pgvector, sets up RLS policies, and creates the `match_journals` RPC function.

### 6. Run the server

```bash
uvicorn main:app --reload --port 8000
```

Visit **http://localhost:8000/docs** for the interactive Swagger UI.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in these values:

```env
# Supabase — Dashboard → Settings → API
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_JWT_SECRET=your_jwt_secret        # Dashboard → Settings → API → JWT

# Groq — console.groq.com → API Keys
GROQ_API_KEY=your_groq_api_key

# HuggingFace — huggingface.co → Settings → Access Tokens
HUGGINGFACE_API_TOKEN=your_hf_token

# App
APP_ENV=development
ALLOWED_ORIGINS=http://localhost:19006,exp://your-expo-url
```

> ⚠️ **Never commit your `.env` file.** It is listed in `.gitignore`.

---

## 📡 API Endpoints

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/` | None | Health check — returns `{"status": "ok"}` |

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | None | Create a new account |
| `POST` | `/auth/login` | None | Log in, receive JWT token |
| `POST` | `/auth/logout` | Bearer | Invalidate current session |

### Core Loop

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/morning-checkin` | Bearer | Submit morning brain scan |
| `POST` | `/evening-response` | Bearer | Generate questions (step 1) or submit answers (step 2) |
| `GET` | `/weekly-summary` | Bearer | Get 7-day trend + AI summary |

---

### POST `/auth/register`

```json
// Request
{ "email": "user@example.com", "password": "min8chars", "username": "minduser" }

// Response 201
{ "user_id": "uuid", "email": "user@example.com", "message": "Registration successful. Please verify your email." }
```

### POST `/auth/login`

```json
// Request
{ "email": "user@example.com", "password": "min8chars" }

// Response 200
{ "access_token": "jwt_token", "token_type": "bearer", "user_id": "uuid" }
```

### POST `/morning-checkin`

```json
// Request
{
  "sleep_score": 6, "mood_score": 4, "stress_score": 8,
  "exercise_done": false,
  "open_text": "I have a big exam today"    // optional
}

// Response 201
{
  "morning_session_id": "uuid",
  "state_flag": "HIGH_REACTIVITY",
  "event_tag": "EVENT_TRIGGER",
  "message": "Morning check-in recorded. See you this evening."
}
```

### POST `/evening-response` — Step 1 (generate questions)

```json
// Request
{ "step": "generate_questions", "morning_session_id": "uuid" }

// Response 200
{
  "evening_session_id": "uuid",
  "questions": { "q1": "...", "q2": "...", "q3": "..." }
}
```

### POST `/evening-response` — Step 2 (submit answers)

```json
// Request
{
  "step": "submit_answers",
  "evening_session_id": "uuid",
  "q1_answer": "It was stressful but I got through it",
  "q2_answer": "When I took a walk after the exam",
  "q3_answer": "You handled it. Trust yourself more."
}

// Response 200
{
  "reframe_response": {
    "acknowledgment": "You carried a heavy load today...",
    "insight": "That walk wasn't an escape — it was self-regulation working.",
    "invitation": "Tomorrow, notice the first moment you feel grounded."
  },
  "crisis_detected": false
}
```

> ⚠️ If `crisis_detected` is `true`, the frontend must immediately show crisis help resources.

### GET `/weekly-summary`

```json
// Response 200
{
  "week_summary": "This week, your journals reveal a recurring theme...",
  "trend": "IMPROVING",
  "days_logged": 5,
  "average_scores": { "mood": 5.4, "sleep": 6.1, "stress": 6.8 }
}
```

---

## 🗃️ Database Schema

| Table | Description |
|---|---|
| `profiles` | Extends `auth.users` with username. Auto-created on signup via trigger. |
| `morning_sessions` | One row per morning check-in. Stores slider scores + state classification. |
| `evening_sessions` | Links to morning session. Stores 3 Q&A pairs + AI reframe. |
| `journal_embeddings` | HuggingFace vectors (384 dims) for Sujan's RAG pipeline. |

Run `supabase_schema.sql` in the Supabase SQL Editor to create everything.

---

## 🧠 State Classification Logic

`services/state_classifier.py` translates morning scores into a **state flag** (priority order — first match wins):

| State Flag | Condition |
|---|---|
| `HIGH_REACTIVITY` | `stress >= 7 AND mood <= 4` OR `stress >= 8` |
| `PHYSICAL_DEPLETION` | `sleep <= 3` OR `(sleep <= 5 AND no exercise AND mood <= 5)` |
| `LOW_BASELINE` | `mood <= 3` OR `(mood <= 4 AND sleep <= 5 AND stress >= 6)` |
| `STABLE` | Everything else |

**Event tag** is set to `EVENT_TRIGGER` when the user's open text is more than 10 characters, `GENERAL_STATE` otherwise.

**Trend detection** (`detect_trend()`): compares a composite wellbeing score `(mood + sleep + (10 - stress)) / 3` across the first 3 vs last 3 days of the week. Returns `IMPROVING`, `DECLINING`, or `FLAT`.

---

## ✅ Running Tests

```bash
# Syntax check all files
python -m py_compile main.py routers/*.py models/*.py services/*.py utils/*.py

# Run state classifier unit tests
python -c "
from services.state_classifier import classify_state, detect_trend
r = classify_state(6, 4, 8, False, 'exam today')
assert r['state_flag'] == 'HIGH_REACTIVITY'
print('All classifier tests passed!')
"
```

---

## 🚢 Deployment (Railway.app)

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub**
3. Select your repo
4. Add all environment variables from your `.env` in Railway's **Variables** tab
5. Railway auto-detects Python and runs `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Your live URL appears in the Railway dashboard — share it with Bidhur for the frontend

---

## 🤝 Integration Contracts

### Bidhur (Frontend)
- All protected endpoints require `Authorization: Bearer <token>` header
- Store the `access_token` from `/auth/login` in Expo's `SecureStore`
- Save `morning_session_id` from `/morning-checkin` to pass into `/evening-response` Step 1
- Save `evening_session_id` from Step 1 to pass into Step 2
- If `crisis_detected: true` in the Step 2 response — show crisis resources screen immediately

### Sujan (AI & RAG)
- Open `services/groq_client.py` — replace the 3 stub functions with real Groq calls
- Function signatures are frozen — do not change parameters or return types
- The `journal_embeddings` table is ready for your RAG pipeline writes

### Danish (Adaptive Engine)
- `detect_trend()` in `services/state_classifier.py` is ready to call
- Query for your trend data:
  ```sql
  SELECT sleep_score, mood_score, stress_score, created_at
  FROM morning_sessions
  WHERE user_id = '<uuid>'
  ORDER BY created_at DESC
  LIMIT 7;
  ```

---

## 📄 License

Internal project — Nepal-US Hackathon 2026. Not for external distribution.