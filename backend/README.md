# 🧠 MindProtocol — Backend API

> Production-ready FastAPI backend for MindProtocol — a daily mental health companion app powered by AI-driven reflection and cognitive reframing.

**Current Version: 2.0.0** — Full authentication system added.

---

## Table of Contents

1. [What Changed in v2.0 (Auth Update)](#what-changed-in-v20)
2. [How Authentication Works](#how-authentication-works)
3. [Quick Start](#quick-start)
4. [Supabase Setup — Step by Step](#supabase-setup)
5. [Environment Variables](#environment-variables)
6. [Complete API Reference](#complete-api-reference)
7. [How Different Users Work](#how-different-users-work)
8. [Client Implementation Guide](#client-implementation-guide)
9. [Project Structure](#project-structure)
10. [Mental State Classification](#mental-state-classification)
11. [Deployment](#deployment)
12. [Security Checklist](#security-checklist)

---

## What Changed in v2.0

This section documents every change made when authentication was added. If you had v1.0 running, read this carefully before upgrading.

### New Files Added

| File | Purpose |
|---|---|
| `app/api/auth_routes.py` | 5 new auth endpoints (register, login, logout, refresh, me) |
| `app/services/auth_service.py` | All auth logic — delegates to Supabase Auth, verifies JWTs locally |
| `app/models/auth_models.py` | Pydantic schemas for auth request/response bodies |

### Files Modified

#### `app/config.py`
Added one new environment variable:
```python
# BEFORE
supabase_url: str = ""
supabase_key: str = ""

# AFTER — added:
supabase_jwt_secret: str = ""   # ← NEW: required for JWT verification
```

#### `app/dependencies.py`
Completely rewritten. Added the `get_current_user` dependency that acts as the auth gate on every protected route.
```python
# NEW: import and use this in any route that requires login
from app.dependencies import get_current_user
from app.services.auth_service import AuthenticatedUser

# Usage in a route:
async def my_route(current_user: AuthenticatedUser = Depends(get_current_user)):
    user_id = current_user.user_id  # verified, cannot be faked
```

#### `app/models/request_models.py`
**Breaking change:** `user_id` field removed from all request bodies.
```python
# BEFORE — MorningCheckinRequest had:
user_id: UUID4   # ← REMOVED (security vulnerability)
sleep_score: int
mood_score: int
...

# AFTER — user_id is gone entirely:
sleep_score: int
mood_score: int
...
# Identity comes from the JWT token in the Authorization header
```

#### `app/api/morning_routes.py`
Added `get_current_user` dependency. `user_id` now comes from the verified token.
```python
# BEFORE
async def morning_checkin(body: MorningCheckinRequest, db=Depends(get_db)):
    user_id = str(body.user_id)  # ← trusted whatever client sent

# AFTER
async def morning_checkin(
    body: MorningCheckinRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),  # ← auth gate
    db=Depends(get_db),
):
    user_id = current_user.user_id  # ← cryptographically verified
```

#### `app/api/evening_routes.py`
Added `get_current_user` dependency **plus** an ownership check — the server now verifies that the session being journalled against actually belongs to the requesting user.
```python
# NEW security check added (line ~55):
if session["user_id"] != user_id:
    raise HTTPException(status_code=403, detail="You do not have access to this session.")
```

#### `app/api/weekly_routes.py`
**Breaking change:** URL path changed. The `{user_id}` path parameter is gone.
```
# BEFORE
GET /api/weekly-summary/{user_id}

# AFTER
GET /api/weekly-summary
# user_id comes from the JWT token — you can only see your own summary
```

#### `app/api/router.py`
Auth routes registered:
```python
# ADDED:
from app.api import auth_routes
api_router.include_router(auth_routes.router, tags=["Authentication"])
```

### New Dependencies in `requirements.txt`

```
PyJWT==2.9.0          # JWT decoding and verification
email-validator==2.2.0  # Required by Pydantic's EmailStr field
```

### New Environment Variable in `.env`

```env
SUPABASE_JWT_SECRET=your-jwt-secret-from-settings
```
Find it at: **Supabase Dashboard → Settings → API → JWT Settings → JWT Secret**

---

## How Authentication Works

### Why the Old Approach Was Broken

The v1.0 API accepted `user_id` in every request body. This meant:
- Any client could claim to be any user by sending a different UUID
- There was no signup/login — users couldn't be created properly
- Foreign key constraints on `sessions` would fail immediately (no matching `users` row)
- User A could read User B's weekly summary by guessing their UUID

### The Fix: Supabase Auth + JWT Tokens

```
┌─────────────┐     POST /api/auth/register        ┌──────────────────┐
│  Mobile App │ ─────────────────────────────────► │  Supabase Auth   │
│             │ ◄─────────────────────────────────  │  • bcrypt hash   │
│             │   { access_token, refresh_token }   │  • JWT signing   │
└─────────────┘                                     └──────────────────┘
       │
       │  Every subsequent request:
       │  Authorization: Bearer <access_token>
       ▼
┌─────────────┐     Verify JWT with HMAC-SHA256     ┌──────────────────┐
│  FastAPI    │ ─────────────────────────────────► │  SUPABASE_JWT    │
│  Dependency │ ◄─────────────────────────────────  │  _SECRET (local) │
│             │   { user_id, email } ✓ verified     │  No network call │
└─────────────┘                                     └──────────────────┘
       │
       │  user_id extracted from token — not from request body
       ▼
   All DB queries scoped to this verified user_id
```

### How JWT Verification Works (No Extra API Call)

Every JWT contains a cryptographic signature made with Supabase's JWT secret. FastAPI verifies this signature locally using the `SUPABASE_JWT_SECRET` you put in `.env`. This means:

- Verification happens in microseconds — no network hop
- A fake or tampered token will fail signature verification immediately
- An expired token is caught by the `exp` claim in the payload

### Token Lifecycle

```
Register/Login
    │
    ├── access_token  (JWT, expires in 1 hour by default)
    │       └── Used in: Authorization: Bearer <token>
    │
    └── refresh_token (opaque, long-lived, single-use)
            └── Used in: POST /api/auth/refresh
                         → returns new access_token + new refresh_token
                         → old refresh_token is invalidated (rotation)
```

---

## Quick Start

### 1. Prerequisites

- Python 3.11+
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Groq](https://console.groq.com) API key
- A [HuggingFace](https://huggingface.co/settings/tokens) access token

### 2. Clone & Install

```bash
git clone <your-repo-url>
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # macOS / Linux
# venv\Scripts\activate       # Windows

# Install all dependencies
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Open .env and fill in all 5 values
```

See the [Supabase Setup](#supabase-setup) section below for where to find each value.

### 4. Run the Database Schema

1. Open Supabase → **SQL Editor** → New Query
2. Paste the entire contents of `schema.sql`
3. Click **Run**

### 5. Start the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive API docs: **http://localhost:8000/docs**

---

## Supabase Setup

Follow these steps in order. Each step gives you a value for `.env`.

### Step 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Pick a name, set a strong database password, choose the region nearest your users
3. Wait about 2 minutes for the project to provision

### Step 2 — Collect Your Keys

Navigate to: **Project Settings → API**

You need three values from this page:

| `.env` variable | Where to find it | Notes |
|---|---|---|
| `SUPABASE_URL` | "Project URL" | Looks like `https://abcxyz.supabase.co` |
| `SUPABASE_KEY` | "service_role" secret key | Click **Reveal** — use this, not the anon key |
| `SUPABASE_JWT_SECRET` | **Settings → API → JWT Settings → JWT Secret** | Click **Reveal** |

> ⚠️ **Use `service_role`, not `anon`** for `SUPABASE_KEY` on the backend.
> The service role key bypasses Row Level Security so the server can freely manage user data.
> Never put the service role key in a mobile app.
>
> ⚠️ **`SUPABASE_JWT_SECRET` is required for auth.** Without it every API request returns 401.

### Step 3 — Run the Database Schema

1. Supabase Dashboard → **SQL Editor** → New Query
2. Paste the full contents of `schema.sql` from this repo
3. Click **Run**

Expected result — these objects will be created:
- Table: `users`
- Table: `sessions`
- Table: `journal_entries`
- Table: `journal_embeddings` (with `vector(384)` column)
- Index: `idx_journal_embeddings_vector` (IVFFlat for fast similarity search)
- Function: `match_journal_embeddings` (RPC used by the RAG pipeline)

### Step 4 — Disable Email Confirmation (Development)

Supabase requires email verification by default. For local development, turn it off:

**Supabase Dashboard → Authentication → Providers → Email**
→ Toggle **"Confirm email"** to **OFF**

This lets you register and immediately log in without checking an inbox.
**Re-enable this for production.**

### Step 5 — Fill in `.env`

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...   ← service_role key
SUPABASE_JWT_SECRET=your-64-character-jwt-secret
GROQ_API_KEY=gsk_...
HUGGINGFACE_API_KEY=hf_...
```

---

## Environment Variables

All variables live in `.env`. Copy from `.env.example` to start.

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_KEY` | ✅ | Supabase **service_role** key |
| `SUPABASE_JWT_SECRET` | ✅ | JWT secret for token verification (Settings → API → JWT Settings) |
| `GROQ_API_KEY` | ✅ | Groq API key for Llama 3.3 70B |
| `HUGGINGFACE_API_KEY` | ✅ | HuggingFace token for embeddings |
| `DEBUG` | ❌ | `true` / `false` (default: `false`) |
| `ALLOWED_ORIGINS` | ❌ | JSON list of CORS origins (default: `["*"]`) |

---

## Complete API Reference

Full interactive docs with request/response schemas: **http://localhost:8000/docs**

---

### 🔓 Public Endpoints — No Token Required

#### `POST /api/auth/register`
Create a new user account.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
- `email` — must be a valid email format
- `password` — minimum 8 characters

**Response `201 Created`:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Error cases:**
| Status | When |
|---|---|
| `400` | Email already registered, or email confirmation required |
| `422` | Invalid email format or password too short |
| `503` | Supabase Auth unavailable |

---

#### `POST /api/auth/login`
Sign in and receive tokens.

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response `200 OK`:** Same shape as register response.

**Error cases:**
| Status | When |
|---|---|
| `401` | Wrong email or password (always same message — prevents email enumeration) |

---

#### `POST /api/auth/refresh`
Exchange a refresh token for a new token pair.

Call this when your `access_token` expires (you'll get a `401` with "expired" in the detail message).

**Request body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200 OK`:** Same shape as login — brand new `access_token` + `refresh_token`.

> ⚠️ Each `refresh_token` is **single-use**. After calling this, the old refresh token is invalidated. Always store the new one.

**Error cases:**
| Status | When |
|---|---|
| `401` | Refresh token expired or already used — user must log in again |

---

### 🔒 Protected Endpoints — Token Required

All protected endpoints require this HTTP header:
```
Authorization: Bearer <access_token>
```

Without it, or with an invalid/expired token, you'll receive:
```json
// 401 Unauthorized
{
  "detail": "Authentication required. Include 'Authorization: Bearer <token>' header."
}
```

---

#### `GET /api/auth/me`
Get the current user's profile. Useful for verifying a token on app startup.

**Response `200 OK`:**
```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com"
}
```

---

#### `POST /api/auth/logout`
Invalidate the current session server-side.

After calling this, delete both tokens from client storage and redirect to the login screen.

**Response `200 OK`:**
```json
{
  "message": "Logged out successfully."
}
```

---

#### `POST /api/morning-checkin`
Record morning brain scan scores. Returns AI-generated evening reflection questions.

> **v2.0 change:** `user_id` removed from request body. Identity comes from the JWT token.

**Request body:**
```json
{
  "sleep_score": 6,
  "mood_score": 4,
  "stress_score": 8,
  "exercise": false,
  "morning_text": "Woke up feeling anxious about the week ahead."
}
```

| Field | Type | Range | Required |
|---|---|---|---|
| `sleep_score` | integer | 0–10 | ✅ |
| `mood_score` | integer | 0–10 | ✅ |
| `stress_score` | integer | 0–10 | ✅ |
| `exercise` | boolean | — | ✅ |
| `morning_text` | string | max 1000 chars | ❌ |

**Score guide:** 0 = worst, 10 = best (for all three scores)

**Response `200 OK`:**
```json
{
  "session_id": "uuid",
  "state_flag": "HIGH_REACTIVITY",
  "evening_questions": [
    "What moment today felt unexpectedly manageable, even briefly?",
    "How did your body signal stress — and what did you do in response?",
    "What is one thing you could release or let go of before tomorrow?"
  ],
  "message": "Morning check-in recorded successfully."
}
```

**Possible `state_flag` values:** `HIGH_REACTIVITY` | `PHYSICAL_DEPLETION` | `LOW_BASELINE` | `ANXIOUS_BUT_FUNCTIONAL` | `STABLE`

---

#### `POST /api/evening-response`
Submit answers to the evening reflection questions. Returns a cognitive reframe.

The server verifies that the `session_id` belongs to the authenticated user before processing.

**Request body:**
```json
{
  "session_id": "uuid-returned-from-morning-checkin",
  "answer_1": "I felt overwhelmed in the morning but found calm after lunch.",
  "answer_2": "Taking a short walk helped me reset my stress levels.",
  "answer_3": "Tomorrow I want to start the day with 10 minutes of meditation."
}
```

**Response `200 OK` — Normal:**
```json
{
  "reflection": "You showed real self-awareness today by noticing the shift from overwhelm to calm...",
  "reframe": "The fact that you found calm after lunch suggests your nervous system has more flexibility than you might give yourself credit for...",
  "micro_action": "Before sleep tonight, write down one thing you handled well today.",
  "crisis_detected": false,
  "support_message": null,
  "help_resources": null
}
```

**Response `200 OK` — Crisis detected** (triggered by crisis keywords in answers):
```json
{
  "reflection": "I noticed something in what you shared that concerns me deeply...",
  "reframe": "CRISIS_DETECTED",
  "micro_action": "Please reach out to a crisis line right now — you deserve support.",
  "crisis_detected": true,
  "support_message": "What you're feeling is real, and support is available right now.",
  "help_resources": [
    "🆘 International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/",
    "🇺🇸 988 Suicide & Crisis Lifeline (US): Call or text 988",
    "🌍 Crisis Text Line: Text HOME to 741741 (US/UK/Canada)",
    "🇬🇧 Samaritans (UK): 116 123",
    "🇦🇺 Lifeline (Australia): 13 11 14"
  ]
}
```

**Error cases:**
| Status | When |
|---|---|
| `404` | `session_id` does not exist |
| `403` | The session belongs to a different user |
| `503` | AI service temporarily unavailable |

---

#### `GET /api/weekly-summary`
Generate a weekly mental health trend analysis for the authenticated user.

> **v2.0 change:** URL was `GET /api/weekly-summary/{user_id}`. The `{user_id}` path parameter is removed. You can only access your own summary.

No request body. Just the `Authorization` header.

**Response `200 OK`:**
```json
{
  "mood_trend": "improving",
  "stress_trend": "declining",
  "sleep_trend": "stable",
  "weekly_summary": "This week you demonstrated consistent improvement in mood despite maintaining elevated stress levels. Your decision to exercise on 4 out of 7 days appears to be acting as a meaningful buffer. Consider what made those exercise days possible and how you might protect that habit next week.",
  "sessions_analyzed": 7
}
```

**Possible trend values:** `improving` | `declining` | `fluctuating` | `stable`

**Error cases:**
| Status | When |
|---|---|
| `404` | No check-ins found in the past 7 days |

---

## How Different Users Work

Here is the complete picture of how two users interact with the system in parallel:

```
─── Registration ────────────────────────────────────────────────────────────

User A: POST /api/auth/register { email: "alice@example.com", password: "..." }
  → Supabase creates auth.users row for Alice (UUID: aaa-111)
  → Server creates public.users row (id: aaa-111)
  → Returns token_A (JWT containing sub: "aaa-111")

User B: POST /api/auth/register { email: "bob@example.com", password: "..." }
  → Supabase creates auth.users row for Bob (UUID: bbb-222)
  → Server creates public.users row (id: bbb-222)
  → Returns token_B (JWT containing sub: "bbb-222")

─── Morning Check-ins ───────────────────────────────────────────────────────

User A: POST /morning-checkin (Authorization: Bearer token_A)
         { sleep_score: 6, mood_score: 4, stress_score: 8, ... }
  → FastAPI decodes token_A → user_id = "aaa-111" (verified)
  → INSERT INTO sessions (user_id = "aaa-111", ...)
  → Returns session_id: "sess-alice-1"

User B: POST /morning-checkin (Authorization: Bearer token_B)
         { sleep_score: 8, mood_score: 7, stress_score: 3, ... }
  → FastAPI decodes token_B → user_id = "bbb-222" (verified)
  → INSERT INTO sessions (user_id = "bbb-222", ...)
  → Returns session_id: "sess-bob-1"

─── Weekly Summaries ────────────────────────────────────────────────────────

User A: GET /weekly-summary (Authorization: Bearer token_A)
  → user_id = "aaa-111"
  → SELECT * FROM sessions WHERE user_id = "aaa-111"
  → Only Alice's sessions returned — Bob's data never touched

User B: GET /weekly-summary (Authorization: Bearer token_B)
  → user_id = "bbb-222"
  → SELECT * FROM sessions WHERE user_id = "bbb-222"
  → Only Bob's sessions returned

─── Cross-user Attack Attempt ───────────────────────────────────────────────

User A tries to journal against Bob's session:
  POST /evening-response (Authorization: Bearer token_A)
  { session_id: "sess-bob-1", answer_1: "...", ... }

  → user_id from token = "aaa-111"
  → Server fetches session "sess-bob-1" → session.user_id = "bbb-222"
  → "aaa-111" ≠ "bbb-222"
  → HTTP 403 Forbidden — access denied ✓

─── RAG Pipeline (per-user isolation) ───────────────────────────────────────

User A's journal embeddings are stored with user_id = "aaa-111"
The similarity search RPC always filters by user_id:
  → Alice's past journals only surface in Alice's reframe responses
  → Bob's journal history is never used for Alice's responses
```

---

## Client Implementation Guide

### Token Storage

Store tokens in the most secure location available on each platform:

| Platform | Recommended |
|---|---|
| iOS | Keychain Services |
| Android | EncryptedSharedPreferences or Android Keystore |
| React Native | `react-native-keychain` library |
| Flutter | `flutter_secure_storage` library |

**Never store tokens in:**
- `AsyncStorage` or `localStorage` — not encrypted
- Redux / Zustand / Riverpod state — cleared on restart
- URL query parameters — logged in server access logs

### Handling Token Expiry

The access token expires in 1 hour. Here's how to handle this gracefully:

```
Request made with access_token
  │
  ├── Success (2xx) → continue normally
  │
  └── 401 response
        │
        ├── detail contains "expired"
        │     → call POST /api/auth/refresh with refresh_token
        │     → on success: store new tokens, retry original request
        │     → on failure (401): tokens fully expired → send user to login screen
        │
        └── detail does NOT contain "expired"
              → token is invalid or malformed
              → clear stored tokens
              → redirect to login screen
```

### Full Example — JavaScript (React Native / Expo)

```javascript
import * as SecureStore from 'expo-secure-store';

const API_BASE = 'https://your-api-url.com/api';

// ─── Auth helpers ──────────────────────────────────────────────

async function register(email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail);

  // Store both tokens securely
  await SecureStore.setItemAsync('access_token', data.access_token);
  await SecureStore.setItemAsync('refresh_token', data.refresh_token);
  return data;
}

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail);

  await SecureStore.setItemAsync('access_token', data.access_token);
  await SecureStore.setItemAsync('refresh_token', data.refresh_token);
  return data;
}

async function refreshTokens() {
  const refreshToken = await SecureStore.getItemAsync('refresh_token');
  if (!refreshToken) throw new Error('No refresh token — please log in.');

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('SESSION_EXPIRED');

  await SecureStore.setItemAsync('access_token', data.access_token);
  await SecureStore.setItemAsync('refresh_token', data.refresh_token);
}

async function logout() {
  const token = await SecureStore.getItemAsync('access_token');
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
}

// ─── Authenticated fetch (auto-refreshes on 401) ──────────────

async function authFetch(url, options = {}, retried = false) {
  const token = await SecureStore.getItemAsync('access_token');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && !retried) {
    const body = await res.json();
    if (body.detail?.includes('expired')) {
      try {
        await refreshTokens();
        return authFetch(url, options, true);  // retry once with new token
      } catch {
        throw new Error('SESSION_EXPIRED');  // redirect to login
      }
    }
    throw new Error('UNAUTHORIZED');
  }

  return res;
}

// ─── App endpoints ────────────────────────────────────────────

async function morningCheckin(data) {
  const res = await authFetch(`${API_BASE}/morning-checkin`, {
    method: 'POST',
    body: JSON.stringify({
      sleep_score: data.sleep,
      mood_score: data.mood,
      stress_score: data.stress,
      exercise: data.exercise,
      morning_text: data.notes ?? null,
      // ← NO user_id — the server extracts it from the token
    }),
  });
  return res.json();
}

async function eveningResponse(sessionId, answers) {
  const res = await authFetch(`${API_BASE}/evening-response`, {
    method: 'POST',
    body: JSON.stringify({
      session_id: sessionId,
      answer_1: answers[0],
      answer_2: answers[1],
      answer_3: answers[2],
    }),
  });
  return res.json();
}

async function getWeeklySummary() {
  const res = await authFetch(`${API_BASE}/weekly-summary`);
  // ← NO user_id in URL — the server knows who you are from the token
  return res.json();
}
```

### Flutter Example (Dart)

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

const storage = FlutterSecureStorage();
const apiBase = 'https://your-api-url.com/api';

Future<Map<String, dynamic>> morningCheckin(Map<String, dynamic> data) async {
  final token = await storage.read(key: 'access_token');

  final response = await http.post(
    Uri.parse('$apiBase/morning-checkin'),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',  // ← token carries identity
    },
    body: jsonEncode({
      'sleep_score': data['sleep'],
      'mood_score': data['mood'],
      'stress_score': data['stress'],
      'exercise': data['exercise'],
      'morning_text': data['notes'],
      // NO user_id in the body
    }),
  );

  if (response.statusCode == 401) {
    await refreshTokens();
    return morningCheckin(data);  // retry
  }

  return jsonDecode(response.body);
}
```

---

## Project Structure

```
backend/
│
├── app/
│   ├── main.py                      # FastAPI app factory, CORS, global error handlers
│   ├── config.py                    # Pydantic settings — reads from .env
│   ├── dependencies.py              # get_db, get_current_user (JWT auth gate)
│   │
│   ├── api/
│   │   ├── router.py                # Mounts all sub-routers under /api
│   │   ├── auth_routes.py           # ✨ NEW: register, login, logout, refresh, me
│   │   ├── morning_routes.py        # POST /morning-checkin (protected)
│   │   ├── evening_routes.py        # POST /evening-response (protected)
│   │   └── weekly_routes.py         # GET /weekly-summary (protected)
│   │
│   ├── models/
│   │   ├── auth_models.py           # ✨ NEW: RegisterRequest, LoginRequest, AuthResponse, etc.
│   │   ├── request_models.py        # MorningCheckinRequest, EveningResponseRequest (no user_id)
│   │   └── response_models.py       # MorningCheckinResponse, EveningReframeResponse, etc.
│   │
│   ├── services/
│   │   ├── auth_service.py          # ✨ NEW: register_user, login_user, verify_jwt, etc.
│   │   ├── classification_service.py # Rule-based mental state classifier (5 states)
│   │   ├── ai_service.py            # Groq Llama 3.3 70B — questions, reframes, summaries
│   │   ├── embedding_service.py     # HuggingFace all-MiniLM-L6-v2 (384-dim embeddings)
│   │   └── trend_service.py         # Linear regression trend detection for weekly summaries
│   │
│   ├── db/
│   │   ├── supabase_client.py       # Singleton Supabase client
│   │   └── repositories.py          # SessionRepository, JournalRepository, EmbeddingRepository
│   │
│   ├── rag/
│   │   ├── vector_store.py          # pgvector write layer — embeds and stores journal text
│   │   └── retriever.py             # Semantic similarity retrieval — surfaces past journals for LLM
│   │
│   ├── prompts/
│   │   ├── question_prompt.py       # System + user prompt for evening question generation
│   │   ├── reframe_prompt.py        # System + user prompt for cognitive reframe (+ crisis keywords)
│   │   └── weekly_prompt.py         # System + user prompt for weekly insight summary
│   │
│   └── utils/
│       └── helpers.py               # utc_now_iso, combine_journal_answers, truncate, setup_logging
│
├── schema.sql          # Full PostgreSQL schema: tables, indexes, pgvector RPC function
├── requirements.txt    # All Python dependencies with pinned versions
├── .env.example        # Template — copy to .env and fill in values
├── Dockerfile          # Docker build for Railway / any container platform
└── README.md           # This file
```

---

## Mental State Classification

The classifier in `app/services/classification_service.py` maps morning scores to a state flag using a priority-ordered rule set:

```python
if stress_score >= 7 and mood_score <= 4:
    return "HIGH_REACTIVITY"      # Emotionally flooded — high stress + low mood

elif sleep_score <= 3:
    return "PHYSICAL_DEPLETION"   # Sleep-deprived — physical recovery priority

elif mood_score <= 3:
    return "LOW_BASELINE"         # Persistently low mood — gentle support needed

elif stress_score >= 6 and mood_score >= 5:
    return "ANXIOUS_BUT_FUNCTIONAL"  # Managing despite stress — monitor and pace

else:
    return "STABLE"               # Relatively balanced — good day for growth work
```

The state flag flows through the entire pipeline:
1. Stored in the `sessions` table
2. Sent to the LLM as context for question generation
3. Used again in the evening for the cognitive reframe prompt
4. Aggregated in the weekly summary (as `state_flags` list)

---

## Deployment

### Docker

```bash
# Build the image
docker build -t mindprotocol-backend .

# Run with env file
docker run -p 8000:8000 --env-file .env mindprotocol-backend

# Or pass vars individually
docker run -p 8000:8000 \
  -e SUPABASE_URL=... \
  -e SUPABASE_KEY=... \
  -e SUPABASE_JWT_SECRET=... \
  -e GROQ_API_KEY=... \
  -e HUGGINGFACE_API_KEY=... \
  mindprotocol-backend
```

### Railway

1. Push this `backend/` folder to a GitHub repository
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repository
4. Go to **Variables** and add all 5 required environment variables
5. Railway detects the `Dockerfile` automatically and deploys

Your API will be live at `https://your-project.up.railway.app`.

### Production Checklist Before Going Live

- [ ] Set `ALLOWED_ORIGINS` to your app's actual domain (not `*`)
- [ ] Re-enable **email confirmation** in Supabase Authentication settings
- [ ] Uncomment the RLS policies at the bottom of `schema.sql` and run them
- [ ] Use Supabase's **anon** key in your mobile app (never service_role)
- [ ] Set `DEBUG=false`
- [ ] Consider setting up a proper Redis-backed rate limiter (replace the in-memory one in `dependencies.py`)

---

## Security Checklist

### Backend Configuration
- [ ] `SUPABASE_KEY` is the `service_role` key — never commit it to version control
- [ ] `SUPABASE_JWT_SECRET` is correctly set in `.env`
- [ ] `.env` is in `.gitignore`
- [ ] `DEBUG=false` in production

### Supabase Settings
- [ ] Email confirmation enabled (Authentication → Providers → Email)
- [ ] RLS policies uncommented and applied (`schema.sql` bottom section)
- [ ] Service role key not exposed in any client-side code

### Mobile Client
- [ ] Tokens stored in Keychain (iOS) or EncryptedSharedPreferences (Android)
- [ ] Token refresh logic implemented (handles 401 + "expired")
- [ ] Tokens deleted on logout
- [ ] Using the **anon** Supabase key in the app (not service_role)

### API
- [ ] `ALLOWED_ORIGINS` restricted to your domain in production
- [ ] All sensitive endpoints require `Authorization: Bearer` header
- [ ] `user_id` never accepted in request bodies (v2.0 — already done)