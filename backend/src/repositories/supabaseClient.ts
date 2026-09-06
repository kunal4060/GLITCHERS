import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { env } from '../config/env.js';

// Polyfill native WebSocket for Node.js environments (prevents Render Node <22 realtime error)
if (typeof globalThis.WebSocket === 'undefined') {
  (globalThis as any).WebSocket = WebSocket;
}

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabase) return supabase;

  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_SERVICE_ROLE_KEY.startsWith('dev-')) {
    try {
      supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        realtime: {
          transport: WebSocket as any,
        },
      });
      console.log('Connected to Supabase PostgreSQL database successfully');
      return supabase;
    } catch (err) {
      console.warn('Failed to initialize Supabase client, using in-memory store fallback:', err);
      return null;
    }
  }

  return null;
}
