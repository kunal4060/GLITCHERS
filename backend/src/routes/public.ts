import type { FastifyPluginAsync } from 'fastify';

const HOME_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NEXA — Student Companion</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1f2937;line-height:1.6}h1{color:#0f766e}a{color:#0f766e}</style></head>
<body>
<h1>NEXA — Student Companion</h1>
<p>NEXA is a mobile app that helps university students stay organized: timetables, tasks, expenses,
exam tracking, attendance, and an on-device AI assistant.</p>
<p>The app can optionally connect to your Google account to read university circulars from Gmail
and sync deadlines with Google Calendar — only with your explicit permission.</p>
<p><a href="/privacy">Privacy Policy</a> &middot; Contact: <a href="mailto:kunalugale4060@gmail.com">kunalugale4060@gmail.com</a></p>
</body></html>`;

const PRIVACY_HTML = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Privacy Policy — NEXA</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1f2937;line-height:1.6}h1,h2{color:#0f766e}</style></head>
<body>
<h1>Privacy Policy — NEXA Student Companion</h1>
<p>Last updated: October 2, 2026</p>
<h2>What we collect</h2>
<ul>
<li><strong>Account info:</strong> your name and email address when you sign in with Google.</li>
<li><strong>Gmail (read-only, optional):</strong> if you connect Gmail, we read university circulars and notices to show summaries inside the app. We never send, delete, or modify your emails.</li>
<li><strong>Google Calendar (optional):</strong> if you connect it, we can push class and deadline reminders to your calendar.</li>
<li><strong>App data:</strong> tasks, expenses, timetable entries, and attendance marks you create in the app.</li>
</ul>
<h2>How we use it</h2>
<p>Your data is used only to provide the app's features (summaries, reminders, organization).
We do not sell your data and do not share it with advertisers.</p>
<h2>On-device AI</h2>
<p>The optional offline AI runs entirely on your phone using a model file you provide. No conversation content leaves your device in offline mode.</p>
<h2>Data deletion</h2>
<p>You can delete your account and all associated data at any time from the app's Privacy settings, or by emailing <a href="mailto:kunalugale4060@gmail.com">kunalugale4060@gmail.com</a>.</p>
<h2>Contact</h2>
<p>Questions: <a href="mailto:kunalugale4060@gmail.com">kunalugale4060@gmail.com</a></p>
</body></html>`;

export const publicRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (_req, reply) => {
    return reply.type('text/html').send(HOME_HTML);
  });
  fastify.get('/privacy', async (_req, reply) => {
    return reply.type('text/html').send(PRIVACY_HTML);
  });
};
