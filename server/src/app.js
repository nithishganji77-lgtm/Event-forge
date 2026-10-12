import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import pinoHttp from 'pino-http';
import path from 'node:path';

import './config/zodMessages.js';
import { config, clientOrigins } from './config/env.js';
import { logger } from './config/logger.js';
import { sanitizeData } from './middleware/sanitizeData.js';
import { apiLimiter } from './middleware/rateLimiters.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ApiError } from './utils/ApiError.js';
import { ERROR_CODES } from './constants/errorCodes.js';
import apiRouter from './routes/index.js';

const app = express();

// Makes req.ip the real client behind a proxy, which is what the rate limiters key on.
if (config.TRUST_PROXY > 0) app.set('trust proxy', config.TRUST_PROXY);
app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    // No Origin header (same-origin requests, curl, health checks) is let through — only a
    // present-but-mismatched Origin is rejected.
    origin: (origin, callback) => {
      if (!origin || clientOrigins.includes(origin)) return callback(null, true);
      // A browser never lets the page read this response (no CORS headers), so the actionable hint
      // goes to the server log for whoever deployed it: usually a frontend missing from CLIENT_URL.
      logger.warn({ origin }, 'Blocked a request from an origin not in CLIENT_URL (add it there if it is your frontend)');
      return callback(new ApiError(403, ERROR_CODES.ORIGIN_NOT_ALLOWED, "This website isn't allowed to use the EventForge API."));
    },
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(sanitizeData);
app.use(pinoHttp({ logger, autoLogging: config.NODE_ENV !== 'test' }));

app.use('/uploads', express.static(path.resolve(config.STORAGE_LOCAL_DIR)));

app.use('/api/v1', apiLimiter, apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
