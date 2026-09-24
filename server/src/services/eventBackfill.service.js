import { Event } from '../models/Event.js';
import { EVENT_STATUS_VALUES } from '../constants/eventStatus.js';
import { DEFAULT_TIMEZONE, isValidTimeZone } from '../utils/eventTime.js';
import { logger } from '../config/logger.js';

// Idempotent one-way migration: computes startsAt/endsAt/registrationClosesAt for events created
// before those fields existed. Status filters query the derived fields directly, so a row that is
// never backfilled would silently vanish from filtered lists — this runs at every boot (cheap when
// there is nothing to do) and via `npm run backfill:event-times`.
//
// Saving a legacy row triggers the Event model's pre-validate hook (`startsAt` is missing), which
// does the actual computation, so backfill and normal writes can never disagree.
//
// Only rows using this app's own status vocabulary are considered. A shared/dev database can hold
// rows from another schema in the same `events` collection (lowercase `published`, no capacity,
// ...); those can never pass this model's validation, so retrying them would just log the same
// errors on every boot.
export async function backfillEventTimes() {
  const legacy = await Event.find({
    status: { $in: EVENT_STATUS_VALUES },
    $or: [{ startsAt: null }, { endsAt: null }],
  });

  let updated = 0;
  let failed = 0;
  for (const event of legacy) {
    try {
      if (!isValidTimeZone(event.timezone)) {
        logger.warn(
          { eventId: event._id, timezone: event.timezone },
          `Unknown timezone on legacy event, resetting to ${DEFAULT_TIMEZONE}`
        );
        event.timezone = DEFAULT_TIMEZONE;
      }
      // eslint-disable-next-line no-await-in-loop
      await event.save();
      updated += 1;
    } catch (err) {
      // e.g. a row whose endDate is before its startDate. It keeps working through the legacy
      // fallbacks in computeDisplayStatus but won't match status filters until fixed by hand.
      failed += 1;
      logger.error({ err, eventId: event._id }, 'Could not backfill event times');
    }
  }

  return { scanned: legacy.length, updated, failed };
}
