import type { FastifyPluginAsync } from 'fastify';
import { googleService } from '../services/google/googleService.js';
import { inMemoryStore } from '../repositories/inMemoryStore.js';
import { authMiddleware } from '../middleware/auth.js';
import { getSupabaseClient } from '../repositories/supabaseClient.js';
import { randomUUID } from 'crypto';

async function syncSupabaseUser(email: string, name?: string, googleId?: string, accessToken?: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: userList } = await supabase.auth.admin.listUsers();
    let authUser = userList?.users?.find((u) => u.email === email);

    if (!authUser) {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: name || 'Student User' },
      });
      if (createErr) console.warn('Supabase createUser warning:', createErr.message);
      authUser = created?.user || undefined;
    }

    if (authUser) {
      const userId = authUser.id;
      await supabase.from('profiles').upsert({
        id: userId,
        email,
        full_name: name || 'Student User',
        university: 'State Technological University',
        course: 'Computer Science & Engineering',
        year: 3,
        semester: 6,
        section: 'A',
      });

      await supabase.from('google_accounts').upsert({
        user_id: userId,
        google_id: googleId || userId,
        email,
        access_token: accessToken || null,
        gmail_connected: true,
        calendar_connected: true,
        scopes: ['userinfo.email', 'userinfo.profile', 'openid'],
      }, { onConflict: 'user_id' });

      return userId;
    }
  } catch (err: any) {
    console.warn('syncSupabaseUser warning:', err?.message || err);
  }
  return null;
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get<{ Querystring: { returnUrl?: string } }>('/google/url', async (req) => {
    const returnUrl = req.query.returnUrl || (typeof req.headers.referer === 'string' ? req.headers.referer : 'http://localhost:8082');
    return { url: googleService.getAuthUrl(returnUrl) };
  });

  fastify.get<{ Querystring: { code?: string; returnUrl?: string } }>('/mock-google-login', async (req, reply) => {
    const returnUrl = req.query.returnUrl || 'http://localhost:8082';
    const cleanBase = returnUrl.split('?')[0].replace(/\/$/, '');
    const defaultId = 'mock_user_' + Date.now();
    let profile = Array.from(inMemoryStore.profiles.values())[0];
    if (!profile) {
      profile = {
        id: defaultId,
        email: 'kunalugale4060@gmail.com',
        fullName: 'Kunal Ugale',
        university: 'State Technological University',
        course: 'Computer Science & Engineering',
        year: 3,
        semester: 6,
        section: 'A',
        cgpa: '8.71',
        creditsCompleted: 42,
        creditsCurrent: 18,
        universityDomain: 'gmail.com',
        isOnboardingComplete: false,
        createdAt: new Date().toISOString(),
      };
      inMemoryStore.profiles.set(profile.id, profile);
    }
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
      const supaUserId = await syncSupabaseUser(email, name, googleId, accessToken);

      let profile = Array.from(inMemoryStore.profiles.values()).find((p) => p.email === email);
      if (!profile) {
        const id = supaUserId || randomUUID();
        profile = {
          id,
          email,
          fullName: name || 'Kunal Ugale',
          university: 'State Technological University',
          course: 'Computer Science & Engineering',
          year: 3,
          semester: 6,
          section: 'A',
          cgpa: '8.71',
          creditsCompleted: 42,
          creditsCurrent: 18,
          universityDomain: email.includes('@') ? email.split('@')[1] : 'university.edu',
          isOnboardingComplete: false,
          createdAt: new Date().toISOString(),
        };
        inMemoryStore.profiles.set(id, profile);
      }

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
    const supaUserId = await syncSupabaseUser(email, name, googleId, accessToken);

    let profile = Array.from(inMemoryStore.profiles.values()).find((p) => p.email === email);
    if (!profile) {
      const id = supaUserId || randomUUID();
      profile = {
        id,
        email,
        fullName: name || 'Kunal Ugale',
        university: 'State Technological University',
        course: 'Computer Science & Engineering',
        year: 3,
        semester: 6,
        section: 'A',
        cgpa: '8.71',
        creditsCompleted: 42,
        creditsCurrent: 18,
        universityDomain: email.includes('@') ? email.split('@')[1] : 'university.edu',
        isOnboardingComplete: false,
        createdAt: new Date().toISOString(),
      };
      inMemoryStore.profiles.set(id, profile);
    }

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

    return {
      accessToken: 'jwt_mock_token_' + profile.id,
      user: profile,
    };
  });

  fastify.get('/me', { preHandler: authMiddleware }, async (req, reply) => {
    const userId = req.userId!;
    const profile = inMemoryStore.profiles.get(userId);
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });
    return { user: profile };
  });

  fastify.patch<{ Body: Record<string, any> }>('/profile', { preHandler: authMiddleware }, async (req, reply) => {
    const userId = req.userId!;
    const profile = inMemoryStore.profiles.get(userId);
    if (!profile) return reply.status(404).send({ error: 'Profile not found' });

    const body = req.body || {};
    const updated = { ...profile, ...body, updatedAt: new Date().toISOString() };
    inMemoryStore.profiles.set(userId, updated);

    // Sync to Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('profiles').update({
          ...(body.fullName ? { full_name: body.fullName } : {}),
          ...(body.university ? { university: body.university } : {}),
          ...(body.course ? { course: body.course } : {}),
          ...(body.year ? { year: body.year } : {}),
          ...(body.semester ? { semester: body.semester } : {}),
          ...(body.section ? { section: body.section } : {}),
        }).eq('id', userId);
      } catch (err) {
        console.warn('Supabase profile update warning:', err);
      }
    }

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

