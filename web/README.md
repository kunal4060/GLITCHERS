# NEXA — Website

Interactive promotional website for NEXA (NIA — Nexa Intelligent Assistance),
the AI student companion app. Built from the actual project codebase and the
app's NIA design system (porcelain / obsidian / eucalyptus / terracotta).

## Files

- `index.html` — self-contained page (all CSS/JS inlined): dashboard-style
  hero, 5-module interactive product tour (timetable, tasks, finance, NIA
  prompts), feature walkthrough, system map, and a **Download App** button
  linking to the latest production APK build on Expo.

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

## Previous site

The older hand-written site (`index.html` + `styles.css` + `app.js` with the
waitlist form) was replaced by this build on 2026-10-02. It remains in git
history if ever needed.
