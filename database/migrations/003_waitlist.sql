-- ====================================================================
-- GLITCHERS: AI Student Life Companion - Database Schema (Supabase / PostgreSQL)
-- Migration: 003_waitlist.sql
-- Waitlist signups collected from the NEXA promotional website.
-- Apply via the Supabase SQL editor (same manual process as 001/002).
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    college TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup for the duplicate-email check on signup.
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist (email);
