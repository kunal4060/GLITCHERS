-- ====================================================================
-- GLITCHERS: AI Student Life Companion - Database Schema (Supabase / PostgreSQL)
-- Migration: 001_initial_schema.sql
-- ====================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    university TEXT,
    course TEXT,
    year INT CHECK (year >= 1 AND year <= 6),
    semester INT CHECK (semester >= 1 AND semester <= 12),
    section TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Google Accounts & Connections
CREATE TABLE IF NOT EXISTS public.google_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    google_id TEXT NOT NULL,
    email TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    gmail_connected BOOLEAN NOT NULL DEFAULT FALSE,
    calendar_connected BOOLEAN NOT NULL DEFAULT FALSE,
    scopes TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_google_user UNIQUE (user_id)
);

-- 4. Academic Structure: Semesters & Subjects
CREATE TABLE IF NOT EXISTS public.semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    code TEXT,
    faculty TEXT,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Timetable & Classes
CREATE TABLE IF NOT EXISTS public.timetables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    semester_id UUID REFERENCES public.semesters(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    timetable_id UUID REFERENCES public.timetables(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    day TEXT NOT NULL CHECK (day IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT,
    faculty TEXT,
    class_type TEXT NOT NULL DEFAULT 'LECTURE' CHECK (class_type IN ('LECTURE', 'LAB', 'TUTORIAL', 'SEMINAR')),
    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    temporary_room TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Calendar Events
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    google_event_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    source TEXT NOT NULL DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'TIMETABLE', 'EMAIL', 'ASSIGNMENT', 'EXAM')),
    recurrence TEXT,
    reminder_minutes INT DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Tasks & Reminders
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'EXTREMELY_IMPORTANT')),
    status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    due_date TIMESTAMPTZ,
    recurrence TEXT,
    related_subject TEXT,
    related_email_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.task_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    reminder_time TIMESTAMPTZ NOT NULL,
    is_sent BOOLEAN NOT NULL DEFAULT FALSE
);

-- 8. Exams & Assignments
CREATE TABLE IF NOT EXISTS public.exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    room TEXT,
    syllabus TEXT,
    importance TEXT NOT NULL DEFAULT 'CRITICAL' CHECK (importance IN ('NORMAL', 'HIGH', 'CRITICAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT,
    deadline TIMESTAMPTZ NOT NULL,
    submission_platform TEXT,
    priority TEXT NOT NULL DEFAULT 'HIGH' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'EXTREMELY_IMPORTANT')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUBMITTED', 'GRADED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Finance: Expenses, Budgets, Debts & Splits
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL CHECK (category IN ('FOOD', 'TRANSPORT', 'EDUCATION', 'SHOPPING', 'ENTERTAINMENT', 'HOSTEL', 'BILLS', 'GROCERIES', 'OTHER')),
    merchant TEXT,
    description TEXT NOT NULL,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type TEXT NOT NULL DEFAULT 'EXPENSE' CHECK (type IN ('EXPENSE', 'INCOME', 'REFUND', 'BORROW', 'LEND', 'TRANSFER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    monthly_limit NUMERIC(12, 2) NOT NULL CHECK (monthly_limit > 0),
    month TEXT NOT NULL, -- YYYY-MM
    category_limits JSONB DEFAULT '{}',
    alert_thresholds INT[] DEFAULT '{75, 90, 100}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_budget_month UNIQUE (user_id, month)
);

CREATE TABLE IF NOT EXISTS public.debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    person TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('OWES_ME', 'I_OWE')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'PARTIALLY_PAID')),
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    due_date TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shared_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
    description TEXT NOT NULL,
    number_of_people INT NOT NULL CHECK (number_of_people >= 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expense_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shared_expense_id UUID NOT NULL REFERENCES public.shared_expenses(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE
);

-- 10. Emails & Processing
CREATE TABLE IF NOT EXISTS public.emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    provider_message_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    subject TEXT NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    is_university_related BOOLEAN NOT NULL DEFAULT FALSE,
    importance TEXT NOT NULL DEFAULT 'NORMAL' CHECK (importance IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
    summary TEXT,
    action_required BOOLEAN NOT NULL DEFAULT FALSE,
    action_item TEXT,
    extracted_deadline TIMESTAMPTZ,
    schedule_change JSONB,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_provider_msg UNIQUE (user_id, provider_message_id)
);

-- 11. Notifications & Preferences
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('CLASS_REMINDER', 'TASK_REMINDER', 'EXAM_REMINDER', 'ASSIGNMENT_DEADLINE', 'IMPORTANT_EMAIL', 'BUDGET_ALERT', 'DEBT_REMINDER', 'SYSTEM_ALERT')),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    source_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('ANDROID', 'IOS', 'WEB')),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    quiet_hours_start TIME NOT NULL DEFAULT '23:00',
    quiet_hours_end TIME NOT NULL DEFAULT '07:00',
    critical_bypass BOOLEAN NOT NULL DEFAULT TRUE,
    floating_assistant_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ai_processing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    university_domain TEXT DEFAULT 'university.edu',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. AI Conversations & Messages
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_results JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Offline Sync Records
CREATE TABLE IF NOT EXISTS public.sync_records (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    client_timestamp TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SYNCED', 'FAILED')),
    retry_count INT NOT NULL DEFAULT 0,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- INDEXES FOR PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_classes_user_day ON public.classes(user_id, day);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_time ON public.calendar_events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due ON public.tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON public.expenses(user_id, category);
CREATE INDEX IF NOT EXISTS idx_debts_user_status ON public.debts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_scheduled ON public.notifications(user_id, scheduled_for, read);
CREATE INDEX IF NOT EXISTS idx_emails_user_received ON public.emails(user_id, received_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_records ENABLE ROW LEVEL SECURITY;

-- Standard tenant isolation policies using auth.uid()
DROP POLICY IF EXISTS "Users access own profile" ON public.profiles;
CREATE POLICY "Users access own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users access own google_accounts" ON public.google_accounts;
CREATE POLICY "Users access own google_accounts" ON public.google_accounts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own semesters" ON public.semesters;
CREATE POLICY "Users access own semesters" ON public.semesters FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own subjects" ON public.subjects;
CREATE POLICY "Users access own subjects" ON public.subjects FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own timetables" ON public.timetables;
CREATE POLICY "Users access own timetables" ON public.timetables FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own classes" ON public.classes;
CREATE POLICY "Users access own classes" ON public.classes FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own calendar_events" ON public.calendar_events;
CREATE POLICY "Users access own calendar_events" ON public.calendar_events FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own tasks" ON public.tasks;
CREATE POLICY "Users access own tasks" ON public.tasks FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own exams" ON public.exams;
CREATE POLICY "Users access own exams" ON public.exams FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own assignments" ON public.assignments;
CREATE POLICY "Users access own assignments" ON public.assignments FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own expenses" ON public.expenses;
CREATE POLICY "Users access own expenses" ON public.expenses FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own budgets" ON public.budgets;
CREATE POLICY "Users access own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own debts" ON public.debts;
CREATE POLICY "Users access own debts" ON public.debts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own shared_expenses" ON public.shared_expenses;
CREATE POLICY "Users access own shared_expenses" ON public.shared_expenses FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own emails" ON public.emails;
CREATE POLICY "Users access own emails" ON public.emails FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own notifications" ON public.notifications;
CREATE POLICY "Users access own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own device_tokens" ON public.device_tokens;
CREATE POLICY "Users access own device_tokens" ON public.device_tokens FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own user_preferences" ON public.user_preferences;
CREATE POLICY "Users access own user_preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own ai_conversations" ON public.ai_conversations;
CREATE POLICY "Users access own ai_conversations" ON public.ai_conversations FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users access own sync_records" ON public.sync_records;
CREATE POLICY "Users access own sync_records" ON public.sync_records FOR ALL USING (auth.uid() = user_id);

