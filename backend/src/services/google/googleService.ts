import { google } from 'googleapis';
import { env } from '../../config/env.js';

export class GoogleService {
  private oauth2Client: any = null;

  constructor() {
    if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && !env.GOOGLE_CLIENT_ID.startsWith('dev-')) {
      this.oauth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI
      );
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
}

export const googleService = new GoogleService();
