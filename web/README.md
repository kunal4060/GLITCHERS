# NEXA — Promotional Website

Static landing page for NEXA (AI-native OS for student life) with an interactive
email-intelligence demo and a waitlist form.

## Files

- `index.html` — page structure (hero, problem, features, interactive demo,
  how-it-works, pricing, FAQ, waitlist form, footer)
- `styles.css` — porcelain / obsidian / eucalyptus / terracotta theme, animations,
  responsive (mobile-first, works at 375px)
- `app.js` — scroll reveals, demo animation, pricing toggle, FAQ accordion,
  waitlist form submission

No build step. Serve the folder as-is.

## Preview locally

```bash
cd web
python3 -m http.server 8080
# open http://localhost:8080
```

## Deploy (GitHub Pages)

1. Repo → **Settings → Pages** → Source: **GitHub Actions**.
2. The `.github/workflows/pages.yml` workflow deploys `./web` on every push to
   `nia-redesign` (or run it manually via workflow_dispatch).
3. The site URL will be shown in the workflow run and under Settings → Pages.

## Waitlist form → backend

The form POSTs JSON `{ name, email, college }` to:

```
(window.NEXA_API_URL || 'https://glitchers-backend.onrender.com/api') + '/waitlist'
```

The backend endpoint is `POST /api/waitlist` (see `backend/src/routes/waitlist.ts`).
It validates with zod, dedupes on email, and stores rows in the `waitlist` table.

**Database:** apply `database/migrations/003_waitlist.sql` in the Supabase SQL
editor (same manual process as migrations 001/002 — see `database/README.md`).
Until the migration is applied, the endpoint returns 503 and the form shows a
friendly "try again" error — it never fakes a success.
