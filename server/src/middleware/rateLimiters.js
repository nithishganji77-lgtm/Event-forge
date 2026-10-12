import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

function rateLimitHandler(req, res, next) {
  next(new ApiError(429, 'RATE_LIMITED', 'Too many requests in a short time. Please wait a few minutes and try again.'));
}

// Same idiom as app.js's `pinoHttp({ autoLogging: config.NODE_ENV !== 'test' })` — a test suite
// exercising auth/register/login repeatedly against one shared `app` import would otherwise blow
// past authLimiter's 20-per-15-min cap before the suite finishes.
const skipInTest = () => config.NODE_ENV === 'test';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipInTest,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: skipInTest,
});

// Limits keyed by the account being targeted (the email in the body), not by the caller. The IP
// limits above are only as good as req.ip, and behind a chain of proxies (TRUST_PROXY > 1) anyone
// who calls the API directly can forge the address it comes from; the account under attack can't be
// disguised that way. Requests without an email are left to validation.
export function createAccountLimiter({ limit, windowMs, message, skipSuccessfulRequests = false, skip = () => false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: (req) => skip(req) || !req.body?.email,
    keyGenerator: (req) => `account:${String(req.body.email).trim().toLowerCase()}`,
    handler: (req, res, next) => next(new ApiError(429, 'RATE_LIMITED', message)),
  });
}

// Only failed sign-ins count, so the real owner signing in normally never uses it up.
export const loginAccountLimiter = createAccountLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1000,
  skipSuccessfulRequests: true,
  message: 'Too many failed sign-in attempts for this account. Please wait 15 minutes or reset your password.',
  skip: skipInTest,
});

// Every request sends an email (and spends the provider's daily quota), whether or not it succeeds.
// Worded so it never reveals whether the address has an account.
export const passwordResetAccountLimiter = createAccountLimiter({
  limit: 3,
  windowMs: 60 * 60 * 1000,
  message: 'Too many password reset requests for this address. Please try again in an hour.',
  skip: skipInTest,
});
