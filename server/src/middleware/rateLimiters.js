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
