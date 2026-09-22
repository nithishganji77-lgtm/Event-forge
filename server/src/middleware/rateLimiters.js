import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';

function rateLimitHandler(req, res, next) {
  next(new ApiError(429, 'RATE_LIMITED', 'Too many requests, please try again later'));
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
});
