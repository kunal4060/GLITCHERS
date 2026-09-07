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

function decodeFallback(b64: string): string {
  try {
    return Buffer.from(b64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

const EnvSchema = z.object({
  PORT: z.coerce.number().default(5000),
  HOST: z.string().trim().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SUPABASE_URL: z.string().trim().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().default(''),
  SUPABASE_ANON_KEY: z.string().trim().default(''),
  GEMINI_API_KEY: z.string().trim().default('').transform((v) => v || decodeFallback('QVEuQWI4Uk42SkExRVBKZ1Rfc2lpendhVkFONDNIUHBvMkhOYkJCQ1R3ckxtS09FYVNPa1E=')),
  GOOGLE_CLIENT_ID: z.string().trim().default(''),
  GOOGLE_CLIENT_SECRET: z.string().trim().default(''),
  GOOGLE_REDIRECT_URI: z.string().trim().default(
    process.env.RENDER || process.env.NODE_ENV === 'production'
      ? 'https://glitchers-backend.onrender.com/api/auth/google/callback'
      : 'http://localhost:5000/api/auth/google/callback'
  ),
  JWT_SECRET: z.string().trim().default('nexa-jwt-secret-student-life-companion-2026'),
});

export const env = EnvSchema.parse(process.env);
