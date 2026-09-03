import type { FastifyPluginAsync } from 'fastify';
import { getSupabaseClient } from '../repositories/supabaseClient.js';
import { env } from '../config/env.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (request, reply) => {
    let dbStatus = 'healthy';
    let dbProvider = 'in-memory';

    const supabase = getSupabaseClient();
    if (supabase) {
      dbProvider = 'supabase';
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error && error.code !== 'PGRST116') {
          dbStatus = `degraded: ${error.message}`;
        }
      } catch (err: any) {
        dbStatus = `unreachable: ${err.message || err}`;
      }
    }

    const memoryUsage = process.memoryUsage();

    return {
      status: dbStatus.startsWith('unreachable') ? 'degraded' : 'ok',
      service: 'GLITCHERS Fastify Backend',
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
