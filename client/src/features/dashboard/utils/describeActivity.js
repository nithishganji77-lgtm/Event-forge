import { ACTION_LABELS } from '../../../utils/auditActionLabels.js';

// Verb phrases for actions that are about a specific event, used when the audit row carries the
// event's title in metadata (rows written before that was added fall back to the generic label).
const EVENT_VERBS = {
  EVENT_CREATED: 'created',
  EVENT_UPDATED: 'updated',
  EVENT_PUBLISHED: 'published',
  EVENT_CANCELLED: 'cancelled',
  EVENT_DUPLICATED: 'duplicated',
  EVENT_DELETED: 'deleted',
  REGISTRATION_CREATED: 'registered for',
  REGISTRATION_WAITLISTED: 'joined the waitlist for',
  REGISTRATION_CANCELLED: 'cancelled their registration for',
  ATTENDANCE_MARKED: 'marked attendance for',
};

// -> { actorName, verb, target, eventId }. `actorName` is null for a waitlist promotion, because
// that audit row's actor is the person who cancelled and freed the spot, not the person who got it,
// so naming them would say the wrong thing. `eventId` is null when there is nothing to link to
// (no metadata, or the event was deleted).
export function describeActivity(log) {
  const actorName = log.actor?.name || 'Someone';
  const title = log.metadata?.eventTitle;
  const eventId = log.action === 'EVENT_DELETED' ? null : (log.metadata?.eventId ?? null);

  if (log.action === 'REGISTRATION_CREATED' && log.metadata?.promotedFromWaitlist) {
    return {
      actorName: null,
      verb: title ? 'A waitlisted attendee was moved into' : 'A waitlisted attendee was promoted',
      target: title ?? null,
      eventId,
    };
  }

  if (title && EVENT_VERBS[log.action]) {
    return { actorName, verb: EVENT_VERBS[log.action], target: title, eventId };
  }

  return { actorName, verb: ACTION_LABELS[log.action] || log.action.toLowerCase().replace(/_/g, ' '), target: null, eventId: null };
}
