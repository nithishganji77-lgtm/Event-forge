import { EventRegistration } from '../models/EventRegistration.js';
import { EVENT_STATUS, REGISTRATION_STATUS, ATTENDANCE_STATUS } from '../constants/eventStatus.js';
import { computeDisplayStatus } from '../utils/eventStatus.js';
import { attachStats } from './event.service.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/User.js';
import { escapeRegex, toSkipLimit } from '../utils/paginate.js';

// Built against EventRegistration's non-partial {event,user} unique index: cancel-then-re-register
// must reuse/update the same document, never insert a second one.
export async function registerForEvent(event, user) {
  if (computeDisplayStatus(event) !== EVENT_STATUS.REGISTRATION_OPEN) {
    throw ApiError.conflict('Registration for this event is closed.');
  }

  const existing = await EventRegistration.findOne({ event: event._id, user: user._id });
  if (existing && existing.status !== REGISTRATION_STATUS.CANCELLED) {
    throw ApiError.conflict('You are already registered for this event.');
  }

  const registeredCount = await EventRegistration.countDocuments({
    event: event._id,
    status: REGISTRATION_STATUS.REGISTERED,
  });
  // Documented, accepted race: this count-then-write isn't atomic (no multi-doc transactions on
  // a standalone Mongo instance, matching the codebase's existing no-transactions stance).
  const resultStatus =
    registeredCount < event.capacity ? REGISTRATION_STATUS.REGISTERED : REGISTRATION_STATUS.WAITLISTED;

  if (existing) {
    existing.status = resultStatus;
    existing.registeredAt = new Date();
    existing.cancelledAt = null;
    existing.attendanceStatus = ATTENDANCE_STATUS.PENDING;
    await existing.save();
    return existing;
  }

  return EventRegistration.create({
    event: event._id,
    user: user._id,
    organization: event.organization,
    status: resultStatus,
  });
}

export async function cancelRegistration(event, user) {
  const existing = await EventRegistration.findOne({ event: event._id, user: user._id });
  if (!existing) throw ApiError.notFound("You aren't registered for this event.");
  if (existing.status === REGISTRATION_STATUS.CANCELLED) {
    throw ApiError.conflict('You have already cancelled your registration for this event.');
  }

  const wasRegistered = existing.status === REGISTRATION_STATUS.REGISTERED;
  existing.status = REGISTRATION_STATUS.CANCELLED;
  existing.cancelledAt = new Date();
  await existing.save();

  let promoted = null;
  if (wasRegistered) {
    promoted = await EventRegistration.findOne({
      event: event._id,
      status: REGISTRATION_STATUS.WAITLISTED,
    }).sort({ registeredAt: 1 });
    if (promoted) {
      promoted.status = REGISTRATION_STATUS.REGISTERED;
      await promoted.save();
    }
  }

  return { cancelled: existing, promoted };
}

// Waitlisted/cancelled registrations never held a confirmed spot, so attendance can't be marked
// for them.
export async function markAttendance(eventId, registrationId, attendanceStatus) {
  const registration = await EventRegistration.findOne({ _id: registrationId, event: eventId });
  if (!registration) throw ApiError.notFound("We couldn't find that registration.");
  if (registration.status !== REGISTRATION_STATUS.REGISTERED) {
    throw ApiError.conflict('Attendance can only be marked for people with a confirmed spot, not for the waitlist or cancelled registrations.');
  }
  registration.attendanceStatus = attendanceStatus;
  await registration.save();
  return registration;
}

export async function listRegistrations(eventId, { page, limit, status, search }) {
  const filter = { event: eventId };
  if (status) filter.status = status;

  // Two steps, as in listMembers: populate({ match }) cannot be combined with parent-side
  // pagination. Only users who actually registered can match, so it is narrowed by the event's
  // own registrations first rather than scanning every user.
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    const registrantIds = await EventRegistration.distinct('user', { event: eventId });
    const users = await User.find({ _id: { $in: registrantIds }, $or: [{ name: pattern }, { email: pattern }] })
      .select('_id')
      .lean();
    filter.user = { $in: users.map((u) => u._id) };
  }

  const { skip, limit: take } = toSkipLimit({ page, limit });
  const [data, total] = await Promise.all([
    EventRegistration.find(filter)
      .populate('user', 'name email avatar')
      .sort({ registeredAt: 1 })
      .skip(skip)
      .limit(take)
      .lean(),
    EventRegistration.countDocuments(filter),
  ]);

  return { data, total };
}

export async function listMyEvents(userId, activeOrgIds) {
  const registrations = await EventRegistration.find({
    user: userId,
    organization: { $in: activeOrgIds },
    status: { $in: [REGISTRATION_STATUS.REGISTERED, REGISTRATION_STATUS.WAITLISTED] },
  })
    .populate('event')
    .sort({ registeredAt: -1 })
    .lean();

  // Every other event-returning endpoint attaches displayStatus/registeredCount/etc — without
  // this, the frontend's EventCard would render undefined values for "my events" specifically.
  return Promise.all(
    registrations.map(async (r) => ({
      ...r,
      event: r.event ? await attachStats(r.event, userId) : null,
    }))
  );
}
