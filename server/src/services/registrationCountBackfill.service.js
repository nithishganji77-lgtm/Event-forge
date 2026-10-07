import { Event } from '../models/Event.js';
import { EventRegistration } from '../models/EventRegistration.js';
import { REGISTRATION_STATUS } from '../constants/eventStatus.js';
import { logger } from '../config/logger.js';

// Self-heals Event.registeredCount (the atomic reservation counter registerForEvent/
// cancelRegistration keep incremented/decremented) against the real EventRegistration count.
// Idempotent and cheap (one aggregation, one bulk write) — runs at every boot, same category of
// fix as backfillEventTimes(). Covers rows seeded/written directly (never through
// registerForEvent, so registeredCount defaults to 0 regardless of how many REGISTERED rows
// actually exist) and guards against any future drift, not just a one-time migration.
export async function backfillRegisteredCounts() {
  const counts = await EventRegistration.aggregate([
    { $match: { status: REGISTRATION_STATUS.REGISTERED } },
    { $group: { _id: '$event', count: { $sum: 1 } } },
  ]);

  const countByEventId = new Map(counts.map((c) => [String(c._id), c.count]));
  const events = await Event.find({}, '_id registeredCount').lean();

  const ops = [];
  for (const event of events) {
    const actual = countByEventId.get(String(event._id)) ?? 0;
    if (event.registeredCount !== actual) {
      ops.push({
        updateOne: { filter: { _id: event._id }, update: { $set: { registeredCount: actual } } },
      });
    }
  }

  if (ops.length > 0) {
    await Event.bulkWrite(ops);
  }

  return { scanned: events.length, corrected: ops.length };
}
