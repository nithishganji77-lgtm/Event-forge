import app from './app.js';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { startDeadlineReminderJob } from './jobs/deadlineReminder.job.js';
import { backfillEventTimes } from './services/eventBackfill.service.js';
import { backfillRegisteredCounts } from './services/registrationCountBackfill.service.js';

async function main() {
  await connectDB();

  // Status filters query startsAt/endsAt directly, so events from before those fields existed must
  // be backfilled before serving. A failure here is logged, not fatal — the API still works, and
  // the legacy fallbacks keep displayStatus correct for un-backfilled rows.
  try {
    const { scanned, updated, failed } = await backfillEventTimes();
    if (scanned > 0) logger.info({ scanned, updated, failed }, 'Event time backfill complete');
  } catch (err) {
    logger.error({ err }, 'Event time backfill failed');
  }

  // Self-heals the atomic registration-capacity counter against the real EventRegistration
  // count — covers rows seeded/written directly and guards against any future drift.
  try {
    const { scanned, corrected } = await backfillRegisteredCounts();
    if (corrected > 0) logger.info({ scanned, corrected }, 'Registered-count backfill complete');
  } catch (err) {
    logger.error({ err }, 'Registered-count backfill failed');
  }

  const deadlineReminderTask = startDeadlineReminderJob();

  const server = app.listen(config.PORT, () => {
    logger.info(`EventForge API listening on port ${config.PORT} (${config.NODE_ENV})`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    deadlineReminderTask.stop();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
