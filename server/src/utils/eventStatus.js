import { EVENT_STATUS } from '../constants/eventStatus.js';

// Event.status only ever gets *written* DRAFT/PUBLISHED/CANCELLED — the other four enum values
// are computed live here and never persisted, so there's no dependency on a cron sweep (Phase 5)
// to advance an event through its lifecycle, and no staleness risk.
//
// Comparisons use the instants derived from date + time + timezone (startsAt/endsAt/
// registrationClosesAt), so an event on today's date at 6 PM is still upcoming at 10 AM. The
// `?? startDate` fallbacks only serve in-memory objects that never went through the Event model's
// pre-validate hook (plain stubs); persisted rows are backfilled at boot.
export function computeDisplayStatus(event, now = new Date()) {
  if (event.status === EVENT_STATUS.CANCELLED) return EVENT_STATUS.CANCELLED;
  if (event.status === EVENT_STATUS.DRAFT) return EVENT_STATUS.DRAFT;

  const startsAt = event.startsAt ?? event.startDate;
  const endsAt = event.endsAt ?? event.endDate;
  const registrationClosesAt = event.registrationClosesAt ?? event.registrationDeadline;

  if (now > endsAt) return EVENT_STATUS.COMPLETED;
  if (now >= startsAt) return EVENT_STATUS.ONGOING;
  if (registrationClosesAt && now > registrationClosesAt) return EVENT_STATUS.REGISTRATION_CLOSED;
  return EVENT_STATUS.REGISTRATION_OPEN;
}

// Capacity-full is deliberately independent of displayStatus — REGISTRATION_OPEN stays open even
// when full; the register button separately offers "join waitlist" instead of hard-closing.
export function isCapacityFull(event, registeredCount) {
  return registeredCount >= event.capacity;
}

// Translates a requested `?status=` filter into a real Mongo query fragment, so filtering by a
// derived status still stays DB-side (pagination-safe) rather than a post-fetch filter.
// `UPCOMING` is a query-only alias (published and not started yet, whether or not registration is
// still open) — it is not a displayStatus value and is deliberately not in EVENT_STATUS.
export function statusFilterToQuery(status, now = new Date()) {
  switch (status) {
    case EVENT_STATUS.DRAFT:
      return { status: EVENT_STATUS.DRAFT };
    case EVENT_STATUS.CANCELLED:
      return { status: EVENT_STATUS.CANCELLED };
    case EVENT_STATUS.COMPLETED:
      return { status: EVENT_STATUS.PUBLISHED, endsAt: { $lt: now } };
    case EVENT_STATUS.ONGOING:
      return { status: EVENT_STATUS.PUBLISHED, startsAt: { $lte: now }, endsAt: { $gte: now } };
    case EVENT_STATUS.REGISTRATION_CLOSED:
      return {
        status: EVENT_STATUS.PUBLISHED,
        startsAt: { $gt: now },
        registrationClosesAt: { $lt: now },
      };
    case EVENT_STATUS.REGISTRATION_OPEN:
      return {
        status: EVENT_STATUS.PUBLISHED,
        startsAt: { $gt: now },
        $or: [{ registrationClosesAt: null }, { registrationClosesAt: { $gte: now } }],
      };
    case 'UPCOMING':
      return { status: EVENT_STATUS.PUBLISHED, startsAt: { $gt: now } };
    default:
      return {};
  }
}
