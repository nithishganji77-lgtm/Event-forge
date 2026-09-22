import pino from 'pino';
import { isProduction } from './env.js';

export const logger = pino(
  isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
);
