import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

// Ten ForgeAI requests a minute per person. Keyed by user, not IP: an office shares one address.
// (The project-wide quota is a separate, shared bucket inside the AI service, because Google's free
// tier counts calls per project and a per-user limit alone cannot protect it.)
export function createAiLimiter({ limit = 10, windowMs = 60_000, skip = () => false } = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip,
    keyGenerator: (req) => String(req.user?._id ?? req.ip),
    handler: (req, res, next) => {
      const seconds = Math.max(1, Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000));
      next(
        new ApiError(
          429,
          ERROR_CODES.RATE_LIMITED,
          `You've sent a lot of ForgeAI requests. Please wait about ${seconds} seconds and try again.`
        )
      );
    },
  });
}

// Skipped under test like the other limiters, so a suite can call the routes freely; the limiter's
// own tests build one with createAiLimiter().
export const aiLimiter = createAiLimiter({ skip: () => config.NODE_ENV === 'test' });
