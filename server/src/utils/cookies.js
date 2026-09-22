import { config, isProduction } from '../config/env.js';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    domain: config.COOKIE_DOMAIN || undefined,
  };
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie('accessToken', accessToken, {
    ...baseCookieOptions(),
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });
  res.cookie('refreshToken', refreshToken, {
    ...baseCookieOptions(),
    path: '/api/v1/auth',
    maxAge: config.REFRESH_TOKEN_TTL_MS,
  });
}

export function clearAuthCookies(res) {
  res.clearCookie('accessToken', { ...baseCookieOptions(), path: '/' });
  res.clearCookie('refreshToken', { ...baseCookieOptions(), path: '/api/v1/auth' });
}
