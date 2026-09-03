-- ====================================================================
-- GLITCHERS Migration 002: Onboarding State Machine & Profile Extensions
-- ====================================================================

-- 1. Extend Profiles Table with academic identifiers and onboarding flag
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS cgpa NUMERIC(4, 2) CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
    ADD COLUMN IF NOT EXISTS credits_completed INT DEFAULT 0 CHECK (credits_completed >= 0),
    ADD COLUMN IF NOT EXISTS credits_current INT DEFAULT 0 CHECK (credits_current >= 0),
    ADD COLUMN IF NOT EXISTS student_id TEXT,
    ADD COLUMN IF NOT EXISTS university_domain TEXT DEFAULT 'university.edu',
    ADD COLUMN IF NOT EXISTS is_onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- 2. Persistent Onboarding State Machine
CREATE TABLE IF NOT EXISTS public.onboarding_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_step TEXT NOT NULL DEFAULT 'GOOGLE_AUTH'
        CHECK (current_step IN (
            'GOOGLE_AUTH',
            'GOOGLE_SERVICES',
            'PROFILE',
            'ACADEMICS',
            'TIMETABLE',
            'TIMETABLE_REVIEW',
            'NOTIFICATION_SETUP',
            'FINANCE_SETUP',
            'FLOATING_ASSISTANT',
            'INITIAL_PROCESSING',
            'COMPLETE'
        )),
    completed_steps TEXT[] NOT NULL DEFAULT '{}',
    is_complete BOOLEAN NOT NULL DEFAULT FALSE,
    data JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_onboarding_user UNIQUE (user_id)
);

-- 3. Initialization Jobs for Idempotent Background Workspace Preparation
CREATE TABLE IF NOT EXISTS public.initialization_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING', 'SKIPPED')),
    step_statuses JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE public.onboarding_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initialization_jobs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: User isolation based on auth.uid()
CREATE POLICY "Users access own onboarding_state"
    ON public.onboarding_state FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users access own initialization_jobs"
    ON public.initialization_jobs FOR ALL
    USING (auth.uid() = user_id);

-- 6. Performance Index
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON public.onboarding_state(user_id);
CREATE INDEX IF NOT EXISTS idx_initialization_jobs_user ON public.initialization_jobs(user_id, status);
