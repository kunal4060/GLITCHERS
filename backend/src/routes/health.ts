import type { FastifyPluginAsync } from 'fastify';
import { getSupabaseClient } from '../repositories/supabaseClient.js';
import { env } from '../config/env.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (request, reply) => {
    let dbStatus: 'healthy' | 'degraded' | 'unreachable' = 'healthy';
    let dbProvider = 'in-memory';

    const supabase = getSupabaseClient();
    if (supabase) {
      dbProvider = 'supabase';
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
          // M33: log internals server-side; never leak them to unauthenticated callers
          console.warn('Health DB probe degraded:', error.message);
          dbStatus = 'degraded';
        }
      } catch (err: any) {
        console.warn('Health DB probe unreachable:', err?.message || err);
        dbStatus = 'unreachable';
      }
    }

    const memoryUsage = process.memoryUsage();

    // M33: top-level status must reflect the DB state, not always "ok"
    const status = dbStatus === 'healthy' ? 'ok' : 'degraded';
    if (status !== 'ok') {
      reply.code(503);
    }

    return {
      status,
      service: 'NEXA Fastify Backend',
      version: '1.0.0',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: {
        provider: dbProvider,
        status: dbStatus,
      },
      memory: {
        heapUsedMB: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        rssMB: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      },
    };
  });
};
