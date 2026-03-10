-- ============================================================
-- MindProtocol — Supabase Schema
-- Run this entire file in the Supabase SQL Editor (once)
-- Project: Nepal-US Hackathon 2026
-- Owner: Nishant (Backend & Database)
-- ============================================================

-- Enable pgvector for journal embeddings (Sujan's RAG pipeline)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- TABLE 1: profiles
-- Auto-created on signup via trigger below.
-- Extends auth.users with a display username.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: each user can only see and edit their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Trigger: auto-insert a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TABLE 2: morning_sessions
-- One row per morning check-in submission.
-- state_flag and event_tag are computed by state_classifier.py
-- ============================================================
CREATE TABLE IF NOT EXISTS public.morning_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sleep_score   INTEGER NOT NULL CHECK (sleep_score BETWEEN 0 AND 10),
    mood_score    INTEGER NOT NULL CHECK (mood_score BETWEEN 0 AND 10),
    stress_score  INTEGER NOT NULL CHECK (stress_score BETWEEN 0 AND 10),
    exercise_done BOOLEAN DEFAULT FALSE,
    open_text     TEXT,
    -- Computed by Nishant's state_classifier.py before insert
    state_flag    TEXT NOT NULL CHECK (state_flag IN ('HIGH_REACTIVITY', 'LOW_BASELINE', 'PHYSICAL_DEPLETION', 'STABLE')),
    event_tag     TEXT NOT NULL CHECK (event_tag IN ('EVENT_TRIGGER', 'GENERAL_STATE')),
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup of a user's recent sessions (Danish's trend query)
CREATE INDEX IF NOT EXISTS idx_morning_sessions_user_created
    ON public.morning_sessions(user_id, created_at DESC);

-- RLS: users can only read/write their own morning sessions
ALTER TABLE public.morning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "morning_sessions_insert_own" ON public.morning_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "morning_sessions_select_own" ON public.morning_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- TABLE 3: evening_sessions
-- Linked to a morning_session. Stores 3 AI questions + user
-- answers + the final AI reframe response.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.evening_sessions (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    morning_session_id   UUID NOT NULL REFERENCES public.morning_sessions(id) ON DELETE CASCADE,
    -- AI-generated questions (set in step 1 of /evening-response)
    q1_question          TEXT NOT NULL,
    q2_question          TEXT NOT NULL,
    q3_question          TEXT NOT NULL,
    -- User answers (set in step 2 of /evening-response)
    q1_answer            TEXT,
    q2_answer            TEXT,
    q3_answer            TEXT,
    -- AI reframe response fields (set after step 2)
    ai_reframe_response  TEXT,         -- Full JSON string of the 3-part reframe
    crisis_detected      BOOLEAN DEFAULT FALSE,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast weekly lookups
CREATE INDEX IF NOT EXISTS idx_evening_sessions_user_created
    ON public.evening_sessions(user_id, created_at DESC);

-- RLS
ALTER TABLE public.evening_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evening_sessions_insert_own" ON public.evening_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "evening_sessions_select_own" ON public.evening_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "evening_sessions_update_own" ON public.evening_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE 4: journal_embeddings
-- Sujan's RAG pipeline writes here. Stores HuggingFace
-- all-MiniLM-L6-v2 embeddings (384 dimensions) for semantic
-- retrieval of past journal entries.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.journal_embeddings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    evening_session_id  UUID NOT NULL REFERENCES public.evening_sessions(id) ON DELETE CASCADE,
    content             TEXT NOT NULL,      -- The journal text that was embedded
    embedding           VECTOR(384),        -- HuggingFace all-MiniLM-L6-v2 output
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ivfflat index for fast approximate nearest-neighbor search
-- Sujan: use this for "find past journal entries similar to tonight's"
CREATE INDEX IF NOT EXISTS idx_journal_embeddings_vector
    ON public.journal_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_journal_embeddings_user
    ON public.journal_embeddings(user_id);

-- RLS
ALTER TABLE public.journal_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_embeddings_insert_own" ON public.journal_embeddings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "journal_embeddings_select_own" ON public.journal_embeddings
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- DANISH'S TREND QUERY (documented here for his reference)
-- Run this in your adaptive engine to get last 7 morning scores:
--
-- SELECT sleep_score, mood_score, stress_score, created_at
-- FROM public.morning_sessions
-- WHERE user_id = '<user_uuid>'
-- ORDER BY created_at DESC
-- LIMIT 7;
-- ============================================================
