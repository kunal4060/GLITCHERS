# NEXA / GLITCHERS Backend — Security Audit

**Date:** 2026-10-09
**Scope:** `~/workspace/glitchers_work/backend/` (Node.js + TypeScript + Fastify 5, Render deploy from `main`)
**Trigger:** Tim asked to apply the @krishanu.builds "19 security defenses" checklist to NEXA
**Prior work:** Oct 2026 deep-audit already fixed OAuth mock bypass, open redirect, AI deleting real expenses, bulk sync corruption

## Verdict

No Critical issues. **1 High, 4 Medium, 3 Low** found. All High/Medium issues **fixed locally** (not committed — awaiting Tim's review).

---

## Findings & Fixes

### 🔴 HIGH

#### H1 — CORS origin prefix-matching bypass (`src/app.ts`)
**What:** `origin.startsWith(o)` with `credentials: true` allowed `https://kunal4060.github.io.evil.com` to pass as `https://kunal4060.github.io`. An attacker site could make credentialed API calls as the victim.
**Fix:** Exact origin match via `Set.has(origin)`.
**Verified:** evil origin → rejected; legit origin → allowed with correct `access-control-allow-origin`.

### 🟡 MEDIUM

#### M1 — Mass assignment in `PATCH /api/tasks/:id` (`src/routes/tasks.ts` + `src/repositories/supabaseStore.ts`)
**What:** `req.body` was spread directly into the task object (`{ ...existing, ...updates }`). A crafted body with `userId`/`id` poisoned the in-memory store (the primary read path), reassigning tasks.
**Fix:** Strip `id`/`userId` from updates inside `updateTask()` — one guard covering both the PATCH route and the sync-batch UPDATE path.
**Verified:** `userId`/`id` unchanged after malicious PATCH; legitimate `title` update still works.

#### M2 — Same mass-assignment vector in `updateDebt()` (`src/repositories/supabaseStore.ts`)
**What:** `record.payload` from the sync batch flowed into `{ ...existing, ...updates }` unfiltered.
**Fix:** Same `id`/`userId` strip in `updateDebt()`.

#### M3 — No per-route rate limits on sensitive endpoints (`src/app.ts`, `src/routes/auth.ts`, `src/routes/chatbot.ts`)
**What:** Global limit was 200 req/min — far too generous for login (brute force) and Gemini AI endpoints (cost abuse: each `/ai/chat` call burns API quota).
**Fix:** Per-route limits via `@fastify/rate-limit` route config:
- `POST /api/auth/login` → 20/min
- `POST /api/ai/chat` → 30/min
- `POST /api/ai/analyze-image` → 10/min
**Verified:** 22nd rapid login hit → HTTP 429.

#### M4 — Error handler leaked internal messages on 5xx (`src/app.ts`)
**What:** `error.message` was sent to clients on all errors, including 500s (DB errors, paths, stack fragments).
**Fix:** 5xx → generic "An unexpected error occurred" (details logged server-side); 4xx keeps client-safe messages.

### 🟢 LOW

#### L1 — OAuth `state` is just the return URL, no CSRF token (`src/services/google/googleService.ts:133`)
Login CSRF theoretically possible (attacker logs victim into attacker's account). Low impact for this app; noted, not changed.

#### L2 — Dev token bypass accepts any `jwt_`-prefixed token without verification in non-production (`src/middleware/auth.ts`)
Dev-only; production path requires valid HMAC. Not changed.

#### L3 — Dead `decodeFallback()` in `src/config/env.ts`
Leftover hinting at a hardcoded-secret fallback pattern. **Removed.**

### ℹ️ INFO / Already-good

- **No hardcoded secrets** in source or scripts (grep for API-key patterns clean).
- **Fail-fast env:** boot throws on missing `JWT_SECRET`/`GEMINI_API_KEY`/etc. instead of running insecure.
- **Gemini key** only logged by length, never the value.
- **IDOR protection good:** all store queries scope by `.eq('user_id', userId)`; routes use `req.userId` from verified token, never client-supplied IDs.
- **Admin broadcast** (`POST /api/notifications/broadcast`) properly gated by `ADMIN_EMAILS` allowlist.
- **Mass-assignment guard** already present on `PATCH /api/auth/profile` (allowlist).
- **Open redirect** already fixed (exact origin match in `sanitizeRedirect`).
- **Demo login** off by default (`ALLOW_DEMO_LOGIN`).
- **npm audit:** blocked by registry policy (`policy_denied`) — dependencies could not be scanned. Deps are recent (Fastify 5.2, zod 3.24, Supabase JS 2.49); recommend running `npm audit` from an unrestricted network.
- **Wipe script** (`scripts/wipeAllData.js`) is CLI-only, not exposed via HTTP. Waitlist routes are not mounted in `app.ts` (dead code).

---

## Test results

- `tsc --noEmit`: clean.
- `tests/apiRoutes.test.ts`: **16/17 pass**. 1 failure (`DELETE /api/privacy/delete-account`) is **pre-existing** — the prior audit added a password requirement (H7) without updating the test. Verified it fails identically without my changes.
- `tests/onboarding.test.ts` + `tests/financeCalculator.test.ts`: 3 failures, all **pre-existing** in the working tree (prior audit's uncommitted changes to `geminiClient.ts`/`calculator.ts`); pass on HEAD, untouched by my files.
- Full `npm test` OOMs in this environment (heap limit) — pre-existing infra limitation; ran suites individually with raised heap.
- Custom smoke test (all pass): CORS evil/legit origins, login 429 rate limit, mass-assignment block, no crash on malformed paths.

## Files changed (local only, NOT committed)

1. `backend/src/app.ts` — CORS exact-match; 5xx error-message suppression
2. `backend/src/routes/auth.ts` — 20/min rate limit on `/login`
3. `backend/src/routes/chatbot.ts` — 30/min on `/ai/chat`, 10/min on `/ai/analyze-image`
4. `backend/src/repositories/supabaseStore.ts` — `id`/`userId` strip in `updateTask()` + `updateDebt()`
5. `backend/src/config/env.ts` — removed dead `decodeFallback()`

## Recommended follow-ups (for Tim)

1. Run `npm audit` from an unrestricted network to scan dependencies.
2. Fix the pre-existing `delete-account` test (send `password` in body) — left untouched deliberately.
3. Consider a random CSRF `state` token in the Google OAuth flow (L1).
4. Review + commit these 5 files when ready — nothing was pushed.
