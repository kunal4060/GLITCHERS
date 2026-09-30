# NEXA — System Design

Playbook Layer 1. Companion to `ARCHITECTURE.md` (which covers the deep
technical topology); this doc answers *what we're building, for whom, and
what's deliberately out*.

> Convention: statements marked **[guess]** are inferred, not verified in
> code. Everything else was checked against the repo on 2026-09-30.

## Problem statement

A university student's day is scattered across Gmail (department circulars,
deadline notices), a static timetable image/PDF, a calendar, a notes app for
assignments, and a finance tracker for monthly budgets and split bills.
Deadlines get missed because the information lives in five places and nothing
connects them.

NEXA is an AI-native OS for student life: one Android app that unifies
**university email intelligence, timetable, calendar, tasks, finance
tracking, and an AI assistant (NIA)**. The defensible wedge (per market
research) is the thing competitors don't do: **email intelligence +
timetable-awareness wired into tasks automatically** — e.g. a circular in
Gmail becomes a deadline task with a reminder, checked against the class
timetable.

## User roles

| Role | Exists today? | Notes |
|---|---|---|
| Student | ✅ | The only role. `profiles` table has no role column; no RBHAC anywhere. |
| Admin / support | ❌ | No admin panel, no admin API routes. |
| University / org tenant | ❌ | No org-level tenancy (see below). |

## Core user flows

1. **Onboarding → connected student.** Install → Google OAuth sign-in →
   profile setup (university, course, year, semester, section) → timetable
   import (photo OCR via Gemini, or manual) → home dashboard.
2. **Circular → deadline task (the hero flow).** Gmail is polled for
   university circulars → NIA extracts dates/deadlines → tasks are created
   with smart reminders → reminders fire around the student's class schedule.
3. **Daily academic ops.** View today's timetable → conflict detector flags
   overlapping classes/exams → assignments tracked with due dates →
   reminders via the reminder engine.
4. **Finance.** Log an expense (typed or natural-language via NIA chat) →
   monthly budget burn-rate computed → debts and bill splits tracked between
   friends.
5. **NIA chat (dual engine).** Online: cloud Gemini with function-calling
   tools over live student context. Offline: on-device Hugging Face SLM
   (GGUF) for instant local actions; changes queue and sync when back online.

## Functional requirements (as built)

- Google OAuth login; JWT-authenticated API (`/api/auth/*`).
- Timetable CRUD + photo extraction + conflict detection.
- Tasks with reminders; exams & assignments tracking.
- Expenses, monthly budgets, debts & shared-expense splits.
- Gmail circular ingestion, email summarization, calendar sync.
- NIA chatbot (Gemini cloud + tool calling; offline SLM engine on device).
- Documents (OCR), search, notifications, user settings & privacy controls.
- Offline action queue with cloud batch sync (`/api/sync`).

## Non-functional requirements

- **Android-first.** Expo app, package `com.nexa.studentcompanion`; iOS exists
  only as `expo run:ios` scaffolding, not a shipped target.
- **Offline-capable.** On-device SLM answers in ~20–80ms with zero data
  leaving the device; queued actions sync later.
- **Tenant isolation.** See below — RLS + service-role backend.
- **Deterministic where it matters.** Finance math, conflict detection and
  reminders are algorithmic engines, not LLM output (see
  `backend/src/services/{finance,tasks,timetable}`).
- **Type safety.** `tsc --noEmit` clean on backend, mobile and shared; one
  shared types package (`@glitchers/shared`) is the contract between tiers.

## Tenancy model (verified)

- **Single shared Postgres database** hosted on Supabase. No per-university
  or per-org databases, no schema-per-tenant.
- **Row-level tenant = the student.** Every data table carries
  `user_id UUID REFERENCES profiles(id) ON DELETE CASCADE`.
- **RLS on all tables.** `database/schema.sql` enables Row Level Security on
  every table with policies like
  `USING (auth.uid() = user_id)` (19 tables, e.g. tasks, expenses, emails,
  timetables, notifications).
- **Backend uses the Supabase service-role key** (`supabaseClient.ts`) and
  scopes all queries to the authenticated user; the mobile app talks to the
  Fastify API (`EXPO_PUBLIC_API_URL`), it does not hold Supabase credentials
  (no `supabase-js` in mobile dependencies) — RLS is defense-in-depth.
- There is also an `inMemoryStore` alongside `supabaseStore` in
  `backend/src/repositories/` **[guess: local/dev fallback or offline cache;
  exact fallback semantics not verified]**.

## Out of scope (deliberate)

- Real payments / subscription billing — no payment API integrated; the
  ₹10/mo / ₹120/yr pricing is a plan, not an implementation.
- Native push notification infrastructure — not confirmed wired up.
- iOS release, web app, multi-user collaboration, university admin tooling.
- Gmail restricted-scope OAuth verification (CASA) and DPDP compliance
  work — identified as risks in research, not yet implemented.

## Open questions

1. **Auth session model:** Google OAuth is implemented; is long-term session
   refresh + token revocation fully handled? (needs Kunal's review)
2. **Push infra:** which provider (FCM via Expo?) sends deadline reminders
   when the app is closed?
3. **Sync conflict resolution:** offline queue + batch sync exists — what
   wins when the same task is edited on two devices?
4. **Payments:** Razorpay/UPI/Play Billing — which one, and when, for the
   ₹10/₹120 pricing?
5. **Rate limiting & abuse:** `@fastify/rate-limit` is installed — is it
   configured on AI endpoints (Gemini cost control)?
6. **Observability:** no Sentry/monitoring wired up yet — needed before
   real users.
