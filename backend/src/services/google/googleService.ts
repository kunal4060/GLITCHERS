import { google } from 'googleapis';
import { env } from '../../config/env.js';
import { getSupabaseClient } from '../../repositories/supabaseClient.js';

interface TokenEntry {
  token: string;
  expiresAt: number; // epoch ms
}

export class GoogleService {
  private oauth2Client: any = null;
  private userTokens = new Map<string, TokenEntry>();

  constructor() {
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && !env.GOOGLE_CLIENT_ID.startsWith('dev-')) {
      this.oauth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI
      );
    }
  }

  public setUserAccessToken(userId: string, token: string, expiresInSec = 3600) {
    this.userTokens.set(userId, { token, expiresAt: Date.now() + expiresInSec * 1000 });
  }

  public getUserAccessToken(userId: string): string | undefined {
    const entry = this.userTokens.get(userId);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.userTokens.delete(userId);
      return undefined;
    }
    return entry.token;
  }

  /**
   * Clears the cached in-memory access token for a user (e.g. on Google
   * disconnect / account deletion). This is the only token cache in the
   * class — the refresh path reads `refresh_token` from Supabase per call,
   * so it dies with the deleted `google_accounts` row.
   */
  public clearUserToken(userId: string): void {
    this.userTokens.delete(userId);
  }

  /**
   * Returns a valid Google access token for the user. Uses the in-memory token
   * when still fresh; otherwise refreshes via the refresh_token persisted in
   * Supabase (google_accounts) and re-caches the new token.
   */
  public async getValidAccessToken(userId: string): Promise<string | undefined> {
    const cached = this.getUserAccessToken(userId);
    if (cached) return cached;
    if (!this.oauth2Client) return undefined;

    try {
      const supabase = getSupabaseClient();
      if (!supabase) return undefined;
      const { data } = await supabase
        .from('google_accounts')
        .select('access_token, refresh_token, token_expires_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (!data?.refresh_token) {
        // No refresh token persisted (e.g. logged in before this fix) —
        // fall back to the stored access token only if it hasn't expired.
        // M10: never return a stored token without checking its expiry.
        if (data?.access_token && data?.token_expires_at) {
          if (new Date(data.token_expires_at).getTime() > Date.now() + 60_000) {
            return data.access_token;
          }
          return undefined; // stored token expired and no refresh token → must re-login
        }
        return data?.access_token || undefined;
      }

      this.oauth2Client.setCredentials({ refresh_token: data.refresh_token });
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      const newToken: string | undefined = credentials.access_token;
      if (!newToken) return undefined;

      // M5: cache only for the token's real remaining lifetime (minus a skew
      // buffer). Never cache a nearly-dead token — return it uncached instead.
      const rawSecs = Math.floor(((credentials.expiry_date || 0) - Date.now()) / 1000);
      if (rawSecs > 90) {
        const expiresIn = rawSecs - 30;
        this.setUserAccessToken(userId, newToken, expiresIn);

        await supabase
          .from('google_accounts')
          .update({
            access_token: newToken,
            token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }

      return newToken;
    } catch (err: any) {
      // M6: invalid_grant means the refresh token is revoked/dead — clear the
      // cached token and signal re-auth instead of retrying forever.
      const msg = String(err?.message || err);
      if (/invalid_grant/i.test(msg)) {
        this.userTokens.delete(userId);
        throw new Error('GOOGLE_REAUTH_REQUIRED');
      }
      console.warn('Google token refresh warning:', msg);
      return undefined;
    }
  }

  public getAuthUrl(stateUrl?: string): string {
    if (!this.oauth2Client) {
      return `http://localhost:5000/api/auth/mock-google-login?code=mock_auth_code`;
    }

    const scopes = [
      'openid',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      state: Buffer.from(stateUrl || 'http://localhost:8082').toString('base64url'),
    });
  }

  public async exchangeCodeForTokens(code: string): Promise<{
    email: string;
    googleId: string;
    name?: string;
    accessToken: string;
    refreshToken?: string;
  }> {
    // C1 SECURITY: mock codes only allowed in non-production (dev/testing)
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd && (!this.oauth2Client || code.startsWith('mock_'))) {
      return {
        email: 'student@university.edu',
        googleId: 'google_sub_' + Math.floor(Math.random() * 1000000000),
        name: 'Student User',
        accessToken: 'mock_google_access_token',
        refreshToken: 'mock_google_refresh_token',
      };
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    return {
      email: userInfo.data.email || 'student@university.edu',
      googleId: userInfo.data.id || 'google_user_id',
      name: userInfo.data.name || (userInfo.data.email ? userInfo.data.email.split('@')[0] : 'Student User'),
      accessToken: tokens.access_token || '',
      // NOTE: googleapis uses snake_case `refresh_token` on the credentials object
      refreshToken: (tokens as any).refresh_token || undefined,
    };
  }

  public async fetchRecentEmails(accessToken: string, maxResults: number = 8): Promise<Array<{
    id: string;
    subject: string;
    sender: string;
    snippet: string;
    date: string;
  }>> {
    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth });

      const listRes = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
      });

      const messages = listRes.data.messages || [];
      const emailList: Array<{ id: string; subject: string; sender: string; snippet: string; date: string }> = [];

      for (const msg of messages) {
        if (!msg.id) continue;
        const msgRes = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });

        const headers = msgRes.data.payload?.headers || [];
        const subjectHeader = headers.find((h) => h.name?.toLowerCase() === 'subject');
        const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from');
        const dateHeader = headers.find((h) => h.name?.toLowerCase() === 'date');

        emailList.push({
          id: msg.id,
          subject: subjectHeader?.value || '(No Subject)',
          sender: fromHeader?.value || 'Unknown Sender',
          snippet: msgRes.data.snippet || '',
          date: dateHeader?.value || new Date().toISOString(),
        });
      }

      return emailList;
    } catch (err) {
      console.warn('Gmail API fetch warning:', err);
      return [];
    }
  }
}

export const googleService = new GoogleService();
