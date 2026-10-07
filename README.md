# NEXA (GLITCHERS)

NEXA is a mobile-first AI student assistant (NIA — Nexa Intelligent Assistance)
that unifies university communications, timetables, academic deadlines, finance
tracking, and shared expenses into one intelligent system.

> **Note:** The backend needs API keys and database settings in `backend/.env`
> (copy from `backend/.env.example`) before it will run fully.

## What it does

1. **Mobile app** (`mobile/`) — React Native / Expo app with timetable, tasks,
   exams, assignments, finance, budgets, borrow/lend, shared expenses, email
   notices, documents, AI chat, and notifications.
2. **Backend API** (`backend/`) — Fastify server exposing REST endpoints for auth,
   timetable, tasks, expenses, debts, calendar sync, emails, AI chat, and search.
3. **Shared** (`shared/`) — common types and utilities used by both.
4. **Database** (`database/`) — PostgreSQL schema (`schema.sql`) and migrations.

## Requirements

- Node.js 22+
- npm
- Expo Go app (to test on a physical device)

## Install

### 1. Clone the repo

```bash
git clone https://github.com/kunal4060/GLITCHERS.git
cd GLITCHERS
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Fill in the keys you plan to use (Supabase, Google OAuth, Gemini).

## Usage

### Start the backend (port 5000)

```bash
npm run backend:dev
```

### Start the mobile app

```bash
npm run mobile:start
```

Press `a` for the Android emulator, `w` for the web preview, or scan the QR
code with Expo Go on your phone.

### Tests and typechecks

```bash
npm test
npm run typecheck
```

## Project structure

```text
GLITCHERS/
├── mobile/      # React Native / Expo app
├── backend/     # Fastify API server
├── shared/      # Shared types and utilities
├── database/    # schema.sql and migrations
├── assets/      # Images
└── render.yaml  # Deployment config
```

Full architecture details live in `ARCHITECTURE.md`.

## License

Proprietary and confidential. Developed for NEXA.

---

*Made by **Shaurya Kumar***
