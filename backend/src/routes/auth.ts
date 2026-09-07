import type { FastifyPluginAsync } from 'fastify';
import { googleService } from '../services/google/googleService.js';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { getSupabaseClient } from '../repositories/supabaseClient.js';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { randomUUID } from 'crypto';

async function syncSupabaseUser(email: string, name?: string, googleId?: string, accessToken?: string): Promise<string | null> {
  const profile = await supabaseStore.syncOrEnsureUser(email, name);
  return profile.id;
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { returnUrl?: string } }>('/google/url', async (req) => {
    const returnUrl = req.query.returnUrl || (typeof req.headers.referer === 'string' ? req.headers.referer : 'http://localhost:8082');
    return { url: googleService.getAuthUrl(returnUrl) };
  });

  fastify.post<{ Body: { email?: string; name?: string } }>('/login', async (req, reply) => {
    const { email, name } = req.body || {};
    if (!email || !email.includes('@')) {
      return reply.status(400).send({ error: 'Valid email is required' });
    }

    const profile = await supabaseStore.syncOrEnsureUser(email, name);
    return {
      accessToken: 'jwt_' + profile.id,
      user: profile,
    };
  });

  fastify.get<{ Querystring: { code?: string; returnUrl?: string; email?: string; name?: string } }>('/mock-google-login', async (req, reply) => {
    const returnUrl = req.query.returnUrl || 'http://localhost:8082';
    const cleanBase = returnUrl.split('?')[0].replace(/\/$/, '');
    const email = req.query.email || 'student@university.edu';
    const name = req.query.name || (email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1));
    const profile = await supabaseStore.syncOrEnsureUser(email, name);
    return reply.redirect(
      `${cleanBase}/?token=jwt_${profile.id}&email=${encodeURIComponent(profile.email)}&name=${encodeURIComponent(profile.fullName)}`
    );
  });

  fastify.get<{ Querystring: { code?: string; error?: string; state?: string } }>('/google/callback', async (req, reply) => {
    const { code, error, state } = req.query || {};
    let frontendUrl = 'http://localhost:8082';
    if (state) {
      try {
        frontendUrl = Buffer.from(state, 'base64url').toString('utf8');
      } catch {
        frontendUrl = state;
      }
    }
    const cleanBase = frontendUrl.split('?')[0].replace(/\/$/, '');

    if (error || !code) {
      return reply.redirect(`${cleanBase}/?auth_error=${encodeURIComponent(error || 'access_denied')}`);
    }

    try {
      const { email, googleId, name, accessToken } = await googleService.exchangeCodeForTokens(code);
      const profile = await supabaseStore.syncOrEnsureUser(email, name);

      if (accessToken) {
        googleService.setUserAccessToken(profile.id, accessToken);
      }

      inMemoryStore.googleConnections.set(profile.id, {
        id: randomUUID(),
        userId: profile.id,
        email,
        gmailConnected: true,
        calendarConnected: true,
        scopes: ['userinfo.email', 'userinfo.profile', 'openid', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.events'],
      });

      await supabaseStore.saveGoogleAccount(profile.id, {
        googleId: googleId || `google_${profile.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email,
        accessToken,
        scopes: ['userinfo.email', 'userinfo.profile', 'openid', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.events'],
      });

      return reply.redirect(
        `${cleanBase}/?token=jwt_${profile.id}&email=${encodeURIComponent(profile.email)}&name=${encodeURIComponent(profile.fullName)}`
      );
    } catch (err: any) {
      return reply.redirect(`${cleanBase}/?auth_error=${encodeURIComponent(err.message)}`);
    }
  });

  fastify.post<{ Body: { code: string } }>('/google/callback', async (req, reply) => {
    const { code } = req.body || {};
    if (!code) {
      return reply.status(400).send({ error: 'Authorization code is required' });
    }

    const { email, googleId, name, accessToken } = await googleService.exchangeCodeForTokens(code);
    const profile = await supabaseStore.syncOrEnsureUser(email, name);

    if (accessToken) {
      googleService.setUserAccessToken(profile.id, accessToken);
    }

    inMemoryStore.googleConnections.set(profile.id, {
      id: randomUUID(),
      userId: profile.id,
      email,
      gmailConnected: true,
      calendarConnected: true,
      scopes: ['userinfo.email', 'userinfo.profile', 'openid', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.events'],
    });

    await supabaseStore.saveGoogleAccount(profile.id, {
      googleId: googleId || `google_${profile.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email,
      accessToken,
      scopes: ['userinfo.email', 'userinfo.profile', 'openid', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.events'],
    });

    return {
      accessToken: 'jwt_' + profile.id,
      user: profile,
    };
  });

  fastify.get('/me', { preHandler: authMiddleware }, async (req, reply) => {
    const userId = req.userId!;
    const profile = await supabaseStore.getProfile(userId);
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });
    return { user: profile };
  });

  fastify.patch<{ Body: Record<string, any> }>('/profile', { preHandler: authMiddleware }, async (req, reply) => {
    const userId = req.userId!;
    const body = req.body || {};
    const updated = await supabaseStore.updateProfile(userId, body);
    return { user: updated };
  });

  fastify.post<{
    Body: {
      gmailConnected?: boolean;
      calendarConnected?: boolean;
      universityDomain?: string;
    };
  }>('/google/services', { preHandler: authMiddleware }, async (req) => {
    const userId = req.userId!;
    const { gmailConnected, calendarConnected, universityDomain } = req.body || {};

    const profile = inMemoryStore.profiles.get(userId);
    if (profile && universityDomain) {
      profile.universityDomain = universityDomain;
      inMemoryStore.profiles.set(userId, profile);
    }

    const currentConn = inMemoryStore.googleConnections.get(userId) || {
      userId,
      email: profile?.email || 'student@university.edu',
      gmailConnected: false,
      calendarConnected: false,
      scopes: [],
    };

    const updatedConn = {
      ...currentConn,
      gmailConnected: gmailConnected !== undefined ? gmailConnected : currentConn.gmailConnected,
      calendarConnected: calendarConnected !== undefined ? calendarConnected : currentConn.calendarConnected,
    };
    inMemoryStore.googleConnections.set(userId, updatedConn);

    return {
      success: true,
      connection: updatedConn,
    };
  });

  fastify.get('/google/status', { preHandler: authMiddleware }, async (req) => {
    const userId = req.userId!;
    const connection = inMemoryStore.googleConnections.get(userId) || {
      userId,
      email: inMemoryStore.profiles.get(userId)?.email || 'student@university.edu',
      gmailConnected: true,
      calendarConnected: true,
      scopes: ['userinfo.email', 'gmail.readonly', 'calendar.events'],
    };
    return { connection };
  });
};

