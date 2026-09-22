import cron from 'node-cron';
import { Event } from '../models/Event.js';
import { EVENT_STATUS } from '../constants/eventStatus.js';
import { notifyDeadlineApproaching } from '../services/notification.service.js';
import { config } from '../config/env.js';
import { logger } from '../config/logger.js';

// Finds published events whose registration deadline falls within the next N hours and haven't
// been reminded yet, notifies eligible members, then stamps deadlineReminderSentAt so a later
// tick doesn't re-notify. Each event is processed in its own try/catch — one bad event must not
// kill the rest of the tick. No transaction (matches the project's standing no-transactions
// tradeoff on a standalone Mongo instance) — the only race is a double-send on overlapping ticks,
// a minor UX annoyance, not a data-integrity concern.
export async function runDeadlineReminderTick() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + config.DEADLINE_REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const events = await Event.find({
    status: EVENT_STATUS.PUBLISHED,
    registrationDeadline: { $ne: null, $gte: now, $lte: windowEnd },
    deadlineReminderSentAt: null,
  });

  let sent = 0;
  for (const event of events) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await notifyDeadlineApproaching(event);
      event.deadlineReminderSentAt = now;
      // eslint-disable-next-line no-await-in-loop
      await event.save();
      sent += 1;
    } catch (err) {
      logger.error({ err, eventId: event._id }, 'Deadline reminder failed for event');
    }
  }

  if (events.length > 0) {
    logger.info({ eventsProcessed: events.length, remindersSent: sent }, 'Deadline reminder tick complete');
  }
}

export function startDeadlineReminderJob() {
  const task = cron.schedule(config.DEADLINE_REMINDER_CRON, () => {
    runDeadlineReminderTick().catch((err) => {
      logger.error({ err }, 'Deadline reminder tick threw unexpectedly');
    });
  });
  logger.info({ schedule: config.DEADLINE_REMINDER_CRON }, 'Deadline reminder job started');
  return task;
}
