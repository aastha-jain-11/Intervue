import { randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/error.middleware.js';

export type GoogleIdentity = {
  providerAccountId: string;
  email: string;
  name: string;
};

export function createOAuthState(): string {
  return randomBytes(32).toString('base64url');
}

export function getGoogleAuthorizationUrl(state: string): string {
  const client = getGoogleClient();

  return client.generateAuthUrl({
    access_type: 'online',
    prompt: 'select_account',
    scope: ['openid', 'email', 'profile'],
    state,
  });
}

export async function exchangeGoogleCode(code: string): Promise<GoogleIdentity> {
  const client = getGoogleClient();

  try {
    const { tokens } = await client.getToken(code);

    if (!tokens.id_token) {
      throw new AppError(401, 'OAUTH_FAILED', 'Google authentication failed');
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      throw new AppError(401, 'OAUTH_FAILED', 'Google account email could not be verified');
    }

    return {
      providerAccountId: payload.sub,
      email: payload.email.toLowerCase(),
      name: payload.name?.trim() || payload.email.split('@')[0],
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, 'OAUTH_FAILED', 'Google authentication failed');
  }
}

function getGoogleClient(): OAuth2Client {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
    throw new AppError(503, 'OAUTH_NOT_CONFIGURED', 'Google authentication is not configured');
  }

  return new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_CALLBACK_URL,
  );
}
