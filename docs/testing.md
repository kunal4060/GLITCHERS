# NEXA — Testing Strategy

Playbook Layer 8a. Short on purpose: the strategy must fit on one screen.

## What's tested today

- **Backend: 6 jest suites** (`backend/tests/`, `jest` + `ts-jest`):
  - `apiRoutes.test.ts` — route smoke tests
  - `financeCalculator.test.ts` — money math (deterministic engine)
  - `conflictDetector.test.ts` — timetable overlap logic
  - `reminderEngine.test.ts` — reminder scheduling logic
  - `timetableExtractor.test.ts` — timetable parsing
  - `onboarding.test.ts` — onboarding flow
- Run with `npm test --workspace=@glitchers/backend` (also runs in CI).
- **Mobile: nothing.** No test runner, no test script, no test files.
  The redesign was verified by `tsc --noEmit`, not by tests.

## What's missing (in priority order)

1. Mobile component/logic tests (store logic in `mobile/src/store`,
   offline queue in `mobile/src/services/` are the highest-value targets).
2. Backend integration tests that hit real routes with a test database
   (today's suites are unit-level).
3. Any end-to-end test (nothing exercises app → API → DB).

## The 3 levels and what each covers here

| Level | Covers | Example in NEXA |
|---|---|---|
| **Unit** | One pure function, no I/O | `financeCalculator`: split ₹X among N friends |
| **Integration** | Route + store/DB together | POST `/api/tasks` creates a row scoped to the user |
| **E2E** | Real user flow across tiers | Onboard → import timetable photo → conflict flagged |

Rule of thumb: put logic in the deterministic engines (`services/`) so it's
unit-testable without mocking the LLM. Never "test" the LLM's prose — test
the parsing/validation around it.

## The one rule

**Never edit a test to make it pass.** If a test fails, the code is wrong
or the requirement changed — fix the code, or change the requirement
deliberately (and say so in the commit message). A test edited to be green
is a lie that compounds.
