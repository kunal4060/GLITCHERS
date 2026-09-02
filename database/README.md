# Supabase Database Migrations

This folder contains reproducible PostgreSQL migrations for **GLITCHERS (AI Student Life Companion)**.

## Applying Migrations

### Option 1: Supabase Dashboard
1. Open your project on [Supabase](https://supabase.com/dashboard).
2. Go to the **SQL Editor**.
3. Copy the contents of [`migrations/001_initial_schema.sql`](./migrations/001_initial_schema.sql) and run.

### Option 2: Supabase CLI
```bash
supabase db push
```

## Security & Row Level Security (RLS)
All student data tables enforce strict tenant isolation via `auth.uid() = user_id`.
Service-role keys remain server-side on the Fastify backend and are never exposed to the client.
