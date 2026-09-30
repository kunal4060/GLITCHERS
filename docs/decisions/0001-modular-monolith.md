# 0001. Modular monolith: npm workspaces + single Fastify backend

Date: 2026-09-30
Status: accepted

## Context

NEXA needed a full-stack foundation (mobile app, API backend, shared
contracts) built by a solo founder, deployable cheaply, with type safety
across tiers. The choice was between separate repos/services per concern and
a single monorepo with one deployable backend.

## Decision

**npm workspaces monorepo** (`nexa-monorepo`) with three packages:

| Package | Stack (verified in `package.json`) | Deploys as |
|---|---|---|
| `shared` | TypeScript types only (`@glitchers/shared`) | npm workspace lib, no runtime |
| `backend` | **Fastify 5** + TypeScript, `zod` env validation, `tsx` dev | Single Node service → Render (`glitchers-backend`) |
| `mobile` | **Expo SDK 52** + React Native 0.76, Zustand, React Navigation | Android APK via EAS (`com.nexa.studentcompanion`) |

Supporting decisions recorded here because they were made together:

- **Postgres via Supabase** as the only database (`@supabase/supabase-js`
  2.x; `database/schema.sql` + `migrations/`). Tenant isolation via
  `user_id` + RLS, not separate databases.
- **Google Gemini** (`@google/generative-ai`) for cloud AI; **Google OAuth**
  (`googleapis`) for Gmail/Calendar access.
- **Dual persistence in backend** (`supabaseStore` + `inMemoryStore` in
  `backend/src/repositories/`).
- **Deterministic engines, not LLM, for money/math/time**: finance
  calculator, timetable conflict detector, reminder engine live in
  `backend/src/services/` as plain algorithms.

## Alternatives considered

- **Microservices** (auth service, AI service, finance service): rejected —
  operational overhead (deploys, networking, auth between services) with no
  scaling need at this stage.
- **Separate repos per package**: rejected — the shared types package is the
  API contract; versioning it across repos would slow down a solo dev.
- **Next.js full-stack / tRPC**: rejected — the client is a native mobile
  app, not a website; a plain REST API over Fastify is simpler to consume
  from React Native.

## Consequences

- ✅ One `npm ci` installs everything; one Render service to keep awake;
  types flow backend ↔ mobile with no codegen.
- ✅ New contributors (collaborators on the repo) get the whole system in
  one clone.
- ⚠️ The backend is a single deployable — a bad deploy takes down all API
  routes (mitigated: Render keeps the last good deploy; health endpoint
  `/health`).
- ⚠️ No enforced module boundaries inside `backend/src/` beyond folders;
  discipline (or future lint rules) must keep domains separated.
- 🔜 If any domain (e.g. the AI pipeline) outgrows the monolith, extract it
  behind the existing REST boundary — record that in a new ADR.
