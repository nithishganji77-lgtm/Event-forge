import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { backfillRegisteredCounts } from '../services/registrationCountBackfill.service.js';

// Manual entry point for the same idempotent backfill the server runs at every boot.
await connectDB();
try {
  const result = await backfillRegisteredCounts();
  logger.info(result, 'Registered-count backfill complete');
} finally {
  await disconnectDB();
}
