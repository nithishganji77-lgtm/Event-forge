import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import pinoHttp from 'pino-http';
import path from 'node:path';

import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { sanitizeData } from './middleware/sanitizeData.js';
import { apiLimiter } from './middleware/rateLimiters.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';

const app = express();

app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
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
