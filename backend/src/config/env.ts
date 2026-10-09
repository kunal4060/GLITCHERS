import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

// Locate .env file across local paths
const candidates = [
  path.resolve(currentDir, '../../.env'),
  path.resolve(currentDir, '../../../.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}
dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(5000),
  HOST: z.string().trim().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().trim().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().default(''),
  SUPABASE_ANON_KEY: z.string().trim().default(''),
  GEMINI_API_KEY: z.string().trim().default(''),
  GOOGLE_CLIENT_ID: z.string().trim().default(''),
  GOOGLE_CLIENT_SECRET: z.string().trim().default(''),
  GOOGLE_REDIRECT_URI: z.string().trim().default(
    process.env.RENDER || process.env.NODE_ENV === 'production'
      ? 'https://glitchers-backend.onrender.com/api/auth/google/callback'
      : 'http://localhost:5000/api/auth/google/callback'
  ),
  JWT_SECRET: z.string().trim().default(''),
});

export const env = EnvSchema.parse(process.env);

// Fail fast on missing required secrets instead of booting with empty
// values and failing cryptically at runtime.
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'JWT_SECRET',
] as const;

const missingEnvVars = requiredEnvVars.filter((key) => {
  const value = env[key];
  return typeof value !== 'string' || value.trim().length === 0;
});

if (missingEnvVars.length > 0) {
  throw new Error('Missing required env vars: ' + missingEnvVars.join(', '));
}
