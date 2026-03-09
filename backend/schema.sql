-- ============================================================
-- MindProtocol — Supabase / PostgreSQL Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Enable pgvector extension (required for embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Sessions (morning check-ins) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sleep_score  INT  NOT NULL CHECK (sleep_score  BETWEEN 0 AND 10),
    mood_score   INT  NOT NULL CHECK (mood_score   BETWEEN 0 AND 10),
    stress_score INT  NOT NULL CHECK (stress_score BETWEEN 0 AND 10),
    exercise     BOOLEAN NOT NULL DEFAULT false,
    morning_text TEXT,
    state_flag   TEXT NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_created
    ON sessions (user_id, created_at DESC);

-- ─── Journal Entries (evening submissions + AI response) ───────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    answer_1    TEXT NOT NULL,
    answer_2    TEXT NOT NULL,
    answer_3    TEXT NOT NULL,
    ai_response TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_user
    ON journal_entries (user_id, created_at DESC);

-- ─── Journal Embeddings (for RAG / vector similarity search) ─────────────────
CREATE TABLE IF NOT EXISTS journal_embeddings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    embedding    VECTOR(384) NOT NULL,   -- all-MiniLM-L6-v2 produces 384-dim vectors
    journal_text TEXT NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- IVFFlat index for approximate nearest-neighbour search
-- Tune lists= based on dataset size (sqrt of expected row count is a good start)
CREATE INDEX IF NOT EXISTS idx_journal_embeddings_vector
    ON journal_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

-- ─── RPC function for pgvector similarity search ──────────────────────────────
-- Called by EmbeddingRepository.similarity_search()
CREATE OR REPLACE FUNCTION match_journal_embeddings(
    query_embedding  VECTOR(384),
    match_user_id    UUID,
    match_count      INT DEFAULT 3
)
RETURNS TABLE (
    id           UUID,
    user_id      UUID,
    journal_text TEXT,
    similarity   FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        je.id,
        je.user_id,
        je.journal_text,
        1 - (je.embedding <=> query_embedding) AS similarity
    FROM journal_embeddings je
    WHERE je.user_id = match_user_id
    ORDER BY je.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- ─── Row Level Security (enable in production) ─────────────────────────────────
-- Uncomment these to enable RLS — requires Supabase Auth integration.

-- ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sessions           ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE journal_entries    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE journal_embeddings ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (users can only access their own data):
-- CREATE POLICY "Users own their sessions"
--     ON sessions FOR ALL
--     USING (user_id = auth.uid());
