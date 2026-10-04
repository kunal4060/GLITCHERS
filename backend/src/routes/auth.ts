import type { FastifyPluginAsync } from 'fastify';
import { googleService } from '../services/google/googleService.js';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { getSupabaseClient } from '../repositories/supabaseClient.js';
import { supabaseStore } from '../repositories/supabaseStore.js';
import { signToken } from '../utils/tokens.js';
import { env } from '../config/env.js';
import { randomUUID } from 'crypto';

async function syncSupabaseUser(email: string, name?: string, googleId?: string, accessToken?: string): Promise<string | null> {
  const profile = await supabaseStore.syncOrEnsureUser(email, name);
  return profile.id;
}

async function verifyGoogleIdToken(idToken: string): Promise<{ email: string; name?: string } | null> {
  try {
    const res = await globalThis.fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) return null;
    const payload = (await res.json()) as { email?: string; name?: string; aud?: string };
    if (!payload.email) return null;
    const clientId = (env.GOOGLE_CLIENT_ID || '').trim();
    if (clientId && !clientId.startsWith('dev-') && payload.aud !== clientId) {
      return null;
    }
    return { email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Access control: only approved emails can log in.
  // Set ALLOWED_EMAILS="a@x.com,b@y.com" on the server to lock down access.
  // When unset/empty, login stays open (so the owner never gets locked out
  // before configuring it).
  const getAllowedEmails = (): Set<string> =>
    new Set(
      (process.env.ALLOWED_EMAILS || '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    );
  const isEmailAllowed = (email: string): boolean => {
    const allowed = getAllowedEmails();
    if (allowed.size === 0) return true;
    return allowed.has(email.trim().toLowerCase());
  };
  const accessDenied = (reply: any) =>
    reply.status(403).send({
      error: 'Access restricted: this email is not on the approved list. Contact the app owner for access.',
    });
  fastify.get<{ Querystring: { returnUrl?: string } }>('/google/url', async (req) => {
    const returnUrl = req.query.returnUrl || (typeof req.headers.referer === 'string' ? req.headers.referer : 'http://localhost:8082');
    return { url: googleService.getAuthUrl(returnUrl) };
  });

  fastify.post<{ Body: { email?: string; name?: string; idToken?: string } }>('/login', async (req, reply) => {
    const { email, name, idToken } = req.body || {};

    if (idToken) {
      // Verify the Google ID token server-side before minting a session token
      const verified = await verifyGoogleIdToken(idToken);
      if (!verified) {
        return reply.status(401).send({ error: 'Invalid Google ID token' });
      }
      if (!isEmailAllowed(verified.email)) return accessDenied(reply);
      const profile = await supabaseStore.syncOrEnsureUser(verified.email, name || verified.name);
      return {
        accessToken: signToken(profile.id),
        user: profile,
      };
    }

    // SECURITY: demo login is OFF by default — only enable explicitly for local dev
    if (process.env.ALLOW_DEMO_LOGIN !== 'true') {
      return reply.status(401).send({ error: 'Demo login is disabled; please sign in with Google' });
    }

    if (!email || !email.includes('@')) {
      return reply.status(400).send({ error: 'Valid email is required' });
    }

    if (!isEmailAllowed(email)) return accessDenied(reply);

    const profile = await supabaseStore.syncOrEnsureUser(email, name);
    return {
      accessToken: signToken(profile.id),
      user: profile,
    };
  });

  // SECURITY: only redirect to known app URLs (prevents open-redirect phishing)
  const ALLOWED_REDIRECT_ORIGINS = [
    'http://localhost:8082',
    'http://localhost:19006',
    'exp://',
  ];
  const sanitizeRedirect = (url: string): string => {
    const fallback = 'http://localhost:8082';
    try {
      const clean = url.split('?')[0].replace(/\/$/, '');
      if (ALLOWED_REDIRECT_ORIGINS.some((o) => clean.startsWith(o))) return clean;
    } catch { /* fall through */ }
    return fallback;
  };

  fastify.get<{ Querystring: { code?: string; error?: string; state?: string; email?: string; name?: string; returnUrl?: string } }>('/mock-google-login', async (req, reply) => {
    // SECURITY: mock login never serves production traffic
    if (process.env.NODE_ENV === 'production') {
      return reply.status(404).send({ error: 'Not found' });
    }
    const returnUrl = req.query.returnUrl || 'http://localhost:8082';
    const cleanBase = sanitizeRedirect(returnUrl);
    const email = req.query.email || 'student@university.edu';
    const name = req.query.name || (email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1));
    if (!isEmailAllowed(email)) return accessDenied(reply);
    const profile = await supabaseStore.syncOrEnsureUser(email, name);
    return reply.redirect(
      `${cleanBase}/?token=${encodeURIComponent(signToken(profile.id))}&email=${encodeURIComponent(profile.email)}&name=${encodeURIComponent(profile.fullName)}`
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
    const cleanBase = sanitizeRedirect(frontendUrl);

    if (error || !code) {
      return reply.redirect(`${cleanBase}/?auth_error=${encodeURIComponent(error || 'access_denied')}`);
    }

    try {
      const { email, googleId, name, accessToken, refreshToken } = await googleService.exchangeCodeForTokens(code);
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
        refreshToken,
        scopes: ['userinfo.email', 'userinfo.profile', 'openid', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.events'],
      });

      return reply.redirect(
        `${cleanBase}/?token=${encodeURIComponent(signToken(profile.id))}&email=${encodeURIComponent(profile.email)}&name=${encodeURIComponent(profile.fullName)}`
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

    const { email, googleId, name, accessToken, refreshToken } = await googleService.exchangeCodeForTokens(code);
    if (!isEmailAllowed(email)) return accessDenied(reply);
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
      refreshToken,
      scopes: ['userinfo.email', 'userinfo.profile', 'openid', 'https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar.events'],
    });

    return {
      accessToken: signToken(profile.id),
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

    // M11: persist universityDomain + connection flags to Supabase (best-effort;
    // never break the route if the DB is unavailable)
    try {
      if (universityDomain) {
        await supabaseStore.updateProfile(userId, { universityDomain });
      }
      const supabase = getSupabaseClient();
      if (supabase && (gmailConnected !== undefined || calendarConnected !== undefined)) {
        await supabase
          .from('google_accounts')
          .update({
            ...(gmailConnected !== undefined ? { gmail_connected: gmailConnected } : {}),
            ...(calendarConnected !== undefined ? { calendar_connected: calendarConnected } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }
    } catch {
      // best-effort only — in-memory state above was already updated
    }

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
      gmailConnected: false,
      calendarConnected: false,
      scopes: [],
    };
    return { connection };
  });

  fastify.delete('/account', { preHandler: authMiddleware }, async (req) => {
    const userId = req.userId!;

    // Clear any cached Google tokens so no background sync can touch this account
    try {
      const svc = googleService as unknown as { clearUserToken?: (uid: string) => unknown };
      if (typeof svc.clearUserToken === 'function') {
        await svc.clearUserToken(userId);
      }
    } catch {
      // best-effort
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const tables = [
        'profiles',
        'expenses',
        'tasks',
        'debts',
        'emails',
        'budgets',
        'notifications',
        'classes',
        'timetables',
        'semesters',
        'subjects',
        'exams',
        'ai_conversations',
        'ai_messages',
        'google_accounts',
        'onboarding_state',
        'initialization_jobs',
        'user_preferences',
      ];
      for (const table of tables) {
        try {
          // profiles is keyed by id; everything else references user_id
          const column = table === 'profiles' ? 'id' : 'user_id';
          await supabase.from(table).delete().eq(column, userId);
        } catch {
          // best-effort: keep deleting the remaining tables
        }
      }
    }

    // Drop any in-memory state for this user as well
    try {
      inMemoryStore.profiles.delete(userId);
      inMemoryStore.googleConnections.delete(userId);
    } catch {
      // best-effort
    }

    return { ok: true };
  });
};
