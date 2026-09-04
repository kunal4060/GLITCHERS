import { google } from 'googleapis';
import { env } from '../../config/env.js';

export class GoogleService {
  private oauth2Client: any = null;
  private userTokens = new Map<string, string>();

  constructor() {
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && !env.GOOGLE_CLIENT_ID.startsWith('dev-')) {
      this.oauth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI
      );
    }
  }

  public setUserAccessToken(userId: string, token: string) {
    this.userTokens.set(userId, token);
  }

  public getUserAccessToken(userId: string): string | undefined {
    return this.userTokens.get(userId);
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
    if (!this.oauth2Client || code.startsWith('mock_')) {
      return {
        email: 'kunalugale4060@gmail.com',
        googleId: 'google_sub_1092837465',
        name: 'Kunal Ugale',
        accessToken: 'mock_google_access_token',
        refreshToken: 'mock_google_refresh_token',
      };
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    return {
      email: userInfo.data.email || 'kunalugale4060@gmail.com',
      googleId: userInfo.data.id || 'google_user_id',
      name: userInfo.data.name || 'Kunal Ugale',
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token || undefined,
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
