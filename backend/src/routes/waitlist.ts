import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getSupabaseClient } from '../repositories/supabaseClient.js';

const WaitlistSchema = z.object({
  name: z.string().trim().min(1, 'Please tell us your name.').max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('That email doesn\u2019t look right.')
    .max(255),
  college: z.string().trim().min(1, 'Please tell us your college.').max(200),
});

// Public route (no auth): collects waitlist signups from the promo site.
export const waitlistRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/', async (request, reply) => {
    const parsed = WaitlistSchema.safeParse(request.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return reply.status(400).send({
        ok: false,
        error: 'validation_error',
        message: first?.message ?? 'Please check your details and try again.',
      });
    }

    const { name, email, college } = parsed.data;

    const supabase = getSupabaseClient();
    if (!supabase) {
      // Database not configured — never fake a success.
      return reply.status(503).send({
        ok: false,
        error: 'unavailable',
        message: 'The waitlist is temporarily unavailable. Please try again in a bit.',
      });
    }

    try {
      const { data: existing, error: lookupError } = await supabase
        .from('waitlist')
        .select('id')
        .eq('email', email)
        .limit(1)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing) {
        return reply.status(200).send({
          ok: true,
          already: true,
          message: "You're already on the list!",
        });
      }

      const { error: insertError } = await supabase
        .from('waitlist')
        .insert({ name, email, college });

      if (insertError) {
        // Race between lookup and insert: treat unique violation as "already on list".
        if (insertError.code === '23505') {
          return reply.status(200).send({
            ok: true,
            already: true,
            message: "You're already on the list!",
          });
        }
        throw insertError;
      }

      return reply.status(201).send({ ok: true });
    } catch {
      return reply.status(500).send({
        ok: false,
        error: 'server_error',
        message: 'Something went wrong on our side. Please try again.',
      });
    }
  });
};
