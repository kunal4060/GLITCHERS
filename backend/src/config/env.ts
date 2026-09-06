import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Locate .env file across local paths
const candidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
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
  GOOGLE_REDIRECT_URI: z.string().trim().default('http://localhost:5000/api/auth/google/callback'),
  JWT_SECRET: z.string().trim().default('glitchers-jwt-secret-student-life-companion-2026'),
});

export const env = EnvSchema.parse(process.env);
