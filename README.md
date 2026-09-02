# 🎓 GLITCHERS — Full-Stack AI Student Life Companion

An autonomous, mobile-first AI-powered student assistant designed to unify university communications, timetable management, academic deadlines, financial tracking, shared expenses, and daily student operations into one intelligent system.

---

## 🏛️ System Architecture

```
                                 GOOGLE CLOUD
                     (OAuth 2.0 / Gmail / Calendar APIs)
                                     │
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          REACT NATIVE MOBILE                           │
│  - Expo SDK 52 / TypeScript / Zustand State Stores                     │
│  - 19 Full-Stack Domain Modules:                                       │
│    • Dashboard: Next-class countdown, 3-card glance, budget gauge      │
│    • Timetable: Day tabs, room/faculty, lecture/lab, conflict alerts  │
│    • Calendar: Academic timetable + Google Calendar synchronization    │
│    • Tasks: Natural language parser, smart reminder timeline           │
│    • Exams: Hall allocations, syllabus coverage, critical alerts       │
│    • Assignments: Platform links (Moodle/Canvas), submission toggle   │
│    • Finance: Natural language expense entry ("Spent 180 on dinner")   │
│    • Budgets: Deterministic math, 75%/90%/100% threshold alerts        │
│    • Borrow & Lend: Rahul owes me ₹500, I owe Aman ₹200, "Mark Paid"   │
│    • Shared Expenses: Group bill division with debt generation         │
│    • Email: University-filtered circulars, reschedule detection        │
│    • Documents: Syllabus & notice AI parser, 1-tap task conversion     │
│    • AI Chat: Conversational student assistant with 12 backend tools   │
│    • Search: Real-time global cross-entity search across all data      │
│    • Notifications: Priority alert feed & Quiet Hours indicator        │
│    • Profile & Settings: Student identity, quiet hours, university domain│
│    • Privacy: Google token revocation, JSON data export, account delete│
│  - Floating Assistant: Draggable bubble (🎓) with translucent windows  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (HTTP / WebSocket)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          FASTIFY BACKEND API                           │
│  - Node.js / TypeScript / ESM                                          │
│  - Modular Endpoints:                                                  │
│    • /api/auth: Google OAuth & token exchange                          │
│    • /api/timetable: Timetable CRUD & schedule conflict engine         │
│    • /api/tasks: Priority reminders & quiet-hours suppression engine   │
│    • /api/expenses & /api/budgets: Category math & spending thresholds │
│    • /api/debts: Borrow/lend records & equal bill splitting           │
│    • /api/calendar: Academic events + Google Calendar synchronizer     │
│    • /api/emails: University notice parser & room change detector      │
│    • /api/ai/chat: Gemini tool execution & hallucination guardrails   │
│    • /api/search: Cross-entity unified search                          │
│    • /api/exams & /api/assignments: Academic assessment trackers       │
│    • /api/documents: Syllabus & circular document parser               │
│    • /api/sync: Offline batch synchronization engine                   │
│    • /api/settings & /api/privacy: Preferences & data privacy controls │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
               ▼                    ▼                    ▼
        ┌─────────────┐      ┌─────────────┐      ┌──────────────┐
        │ GEMINI AI   │      │  SUPABASE   │      │ GOOGLE APIs  │
        │ Function    │      │ PostgreSQL  │      │ Gmail API    │
        │ Calling     │      │ Relational  │      │ Calendar API │
        └─────────────┘      └─────────────┘      └──────────────┘
               │
               ▼ (Android Native Bridge)
┌────────────────────────────────────────────────────────────────────────┐
│                   ANDROID FLOATING ASSISTANT                           │
│  - Kotlin WindowManager Overlay Service (TYPE_APPLICATION_OVERLAY)     │
│  - Draggable Touch Tracking & Mini Dock UI                             │
│  - React Native Bridge: FloatingOverlayModule.kt                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start & Local Development

### 1. Prerequisites
- **Node.js**: v18+ (tested on v24.7)
- **npm**: v10+
- **Git**

### 2. Clone and Install Monorepo Dependencies
```bash
git clone https://github.com/kunal4060/GLITCHERS.git
cd GLITCHERS
npm install
```

### 3. Start Fastify Backend API
```bash
# In terminal 1 (starts on port 5000)
npm run backend:dev
```
Verify backend health:
```bash
curl http://localhost:5000/health
# {"status":"ok","service":"GLITCHERS Fastify Backend"}
```

### 4. Start React Native Mobile Frontend (Expo)
```bash
# In terminal 2
npm run mobile:start
```
- Press `a` for Android emulator
- Press `w` for Web preview
- Scan QR code with Expo Go on a physical device

---

## 🧪 Automated Test Verification

GLITCHERS includes an automated test suite verifying all deterministic finance math, conflict detection algorithms, reminder schedules, and Fastify API endpoints:

```bash
# Run all tests
npm test

# Run monorepo typechecks
npm run typecheck
```

### Test Results:
```text
> @glitchers/shared@1.0.0 typecheck: 0 errors
> @glitchers/backend@1.0.0 typecheck: 0 errors
> @glitchers/mobile@1.0.0 typecheck: 0 errors

PASS tests/apiRoutes.test.ts (12 integration test suites)
PASS tests/conflictDetector.test.ts
PASS tests/financeCalculator.test.ts
PASS tests/reminderEngine.test.ts

Test Suites: 4 passed, 4 total
Tests:       23 passed, 23 total
Snapshots:   0 total
Time:        5.782 s
```

---

## ⚙️ Environment Configuration

Backend configuration is managed in `backend/.env`. A template is provided in `backend/.env.example`:

| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | Fastify server port | `5000` |
| `HOST` | Fastify bind host | `0.0.0.0` |
| `NODE_ENV` | Environment mode | `development` |
| `JWT_SECRET` | Secret for signing local session tokens | `development-jwt-secret-key-min-32-chars` |
| `SUPABASE_URL` | Supabase project URL | Optional (built-in in-memory fallback enabled) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role secret | Optional |
| `GOOGLE_CLIENT_ID` | Google OAuth Web Client ID | Optional (mock OAuth enabled for test) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Optional |
| `GEMINI_API_KEY` | Google Gemini API Key | Optional (deterministic parser fallback enabled) |

---

## 📱 Android Floating Assistant Setup

The Android Floating Assistant is implemented in Kotlin via Android's `WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY`.

- **Files**:
  - Service: [`mobile/android/FloatingBubbleService.kt`](./mobile/android/FloatingBubbleService.kt)
  - Bridge: [`mobile/android/FloatingOverlayModule.kt`](./mobile/android/FloatingOverlayModule.kt)
- **Permissions**:
  - `android.permission.SYSTEM_ALERT_WINDOW`
  - In Android Settings -> Apps -> GLITCHERS -> "Display over other apps" -> Allow.
- **Features**:
  - Floats above all Android applications.
  - Remembers screen coordinates on drag.
  - One-tap access to Mini Email, Mini Finance, Mini Tasks, Mini Calendar, and Mini AI.

---

## 📚 Master Documentation References

- [`PROMPT.md`](./PROMPT.md) — Complete 3,142-line product requirements and specifications
- [`INSTRUCTION.md`](./INSTRUCTION.md) — Engineering agent non-negotiable rules and quality gates
- [`IDIA.md`](./IDIA.md) — Product vision, user stories, and feature roadmap
- [`AGENTS.md`](./AGENTS.md) — Antigravity agent configuration and Ponytail senior dev rules
- [`ponytail.md`](./ponytail.md) — Ponytail guidelines & slash commands

---

## 📄 License

Proprietary & Confidential. Developed for GLITCHERS.
