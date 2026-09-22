import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { config } from '../config/env.js';

export function signAccessToken(userId) {
  return jwt.sign({ sub: String(userId), jti: randomUUID() }, config.JWT_SECRET, {
    expiresIn: config.ACCESS_TOKEN_TTL,
  });
}

export function signRefreshToken(userId, tokenVersion) {
  return jwt.sign(
    { sub: String(userId), jti: randomUUID(), tokenVersion },
    config.JWT_REFRESH_SECRET,
    { expiresIn: config.REFRESH_TOKEN_TTL }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.JWT_REFRESH_SECRET);
}

export function issueAuthTokens(user) {
  return {
    accessToken: signAccessToken(user._id),
    refreshToken: signRefreshToken(user._id, user.refreshTokenVersion),
  };
}
