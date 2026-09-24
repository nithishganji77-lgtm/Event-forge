import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { backfillEventTimes } from '../services/eventBackfill.service.js';

// Manual entry point for the same idempotent backfill the server runs at every boot.
await connectDB();
try {
  const result = await backfillEventTimes();
  logger.info(result, 'Event time backfill complete');
} finally {
  await disconnectDB();
}
