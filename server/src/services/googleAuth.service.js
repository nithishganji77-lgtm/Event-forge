import { OAuth2Client } from 'google-auth-library';
import { config, googleAuthConfigured } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const client = googleAuthConfigured ? new OAuth2Client(config.GOOGLE_CLIENT_ID) : null;

export async function verifyGoogleCredential(idToken) {
  if (!client) {
    throw ApiError.badRequest('Google sign-in is not configured on this server');
  }

  let ticket;
  try {
    ticket = await client.verifyIdToken({ idToken, audience: config.GOOGLE_CLIENT_ID });
  } catch {
    throw ApiError.unauthorized('Invalid Google credential');
  }

  const payload = ticket.getPayload();
  if (!payload?.email_verified) {
    throw ApiError.unauthorized('Google account email is not verified');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email,
    avatar: payload.picture || null,
  };
}
