import { EVENT_STATUS } from '../constants/eventStatus.js';

// Event.status only ever gets *written* DRAFT/PUBLISHED/CANCELLED — the other four enum values
// are computed live here and never persisted, so there's no dependency on a cron sweep (Phase 5)
// to advance an event through its lifecycle, and no staleness risk.
export function computeDisplayStatus(event, now = new Date()) {
  if (event.status === EVENT_STATUS.CANCELLED) return EVENT_STATUS.CANCELLED;
  if (event.status === EVENT_STATUS.DRAFT) return EVENT_STATUS.DRAFT;

  if (now > event.endDate) return EVENT_STATUS.COMPLETED;
  if (now >= event.startDate) return EVENT_STATUS.ONGOING;
  if (event.registrationDeadline && now > event.registrationDeadline) {
    return EVENT_STATUS.REGISTRATION_CLOSED;
  }
  return EVENT_STATUS.REGISTRATION_OPEN;
}

// Capacity-full is deliberately independent of displayStatus — REGISTRATION_OPEN stays open even
// when full; the register button separately offers "join waitlist" instead of hard-closing.
export function isCapacityFull(event, registeredCount) {
  return registeredCount >= event.capacity;
}

// Translates a requested `?status=` filter into a real Mongo query fragment, so filtering by a
// derived status still stays DB-side (pagination-safe) rather than a post-fetch filter.
export function statusFilterToQuery(status, now = new Date()) {
  switch (status) {
    case EVENT_STATUS.DRAFT:
      return { status: EVENT_STATUS.DRAFT };
    case EVENT_STATUS.CANCELLED:
      return { status: EVENT_STATUS.CANCELLED };
    case EVENT_STATUS.COMPLETED:
      return { status: EVENT_STATUS.PUBLISHED, endDate: { $lt: now } };
    case EVENT_STATUS.ONGOING:
      return { status: EVENT_STATUS.PUBLISHED, startDate: { $lte: now }, endDate: { $gte: now } };
    case EVENT_STATUS.REGISTRATION_CLOSED:
      return {
        status: EVENT_STATUS.PUBLISHED,
        startDate: { $gt: now },
        registrationDeadline: { $lt: now },
      };
    case EVENT_STATUS.REGISTRATION_OPEN:
      return {
        status: EVENT_STATUS.PUBLISHED,
        startDate: { $gt: now },
        $or: [{ registrationDeadline: null }, { registrationDeadline: { $gte: now } }],
      };
    default:
      return {};
  }
}
