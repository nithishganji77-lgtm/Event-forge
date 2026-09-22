import app from './app.js';
import { config } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { startDeadlineReminderJob } from './jobs/deadlineReminder.job.js';

async function main() {
  await connectDB();

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
