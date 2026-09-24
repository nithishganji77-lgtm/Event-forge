import { Event } from '../models/Event.js';
import { EventRegistration } from '../models/EventRegistration.js';
import { Invite } from '../models/Invite.js';
import { EVENT_STATUS, REGISTRATION_STATUS, ATTENDANCE_STATUS } from '../constants/eventStatus.js';
import { INVITE_STATUS } from '../constants/inviteStatus.js';
import { monthBoundsInZone } from '../utils/eventTime.js';

// "Participation by Department" is deliberately not computed here — no `department` field exists
// anywhere on User/OrganizationMember. If one is ever added, it would slot in as another
// aggregation grouped by that field, same $group-by-member-field pattern as mostPopularEvents.

// Same ownership definition as middleware/requireEventOwnership.js — createdBy or listed in
// organizers[]. null scopeToUserId means "admin, no scoping" (matches the caller's role check).
export async function resolveScopedEventIds(organizationId, scopeToUserId) {
  if (!scopeToUserId) return null;
  const events = await Event.find({
    organization: organizationId,
    $or: [{ createdBy: scopeToUserId }, { organizers: scopeToUserId }],
  }).select('_id');
  return events.map((e) => e._id);
}

function attendanceRateFrom(attended, noShow) {
  const denominator = attended + noShow;
  return denominator === 0 ? null : attended / denominator;
}

export async function getOrgAnalytics(organizationId, scopeToUserId) {
  const eventIds = await resolveScopedEventIds(organizationId, scopeToUserId);
  const eventFilter = eventIds ? { _id: { $in: eventIds } } : { organization: organizationId };
  const regFilter = eventIds ? { event: { $in: eventIds } } : { organization: organizationId };

  const [totalEvents, totalRegistrations, totalRegDocs, cancelledCount, attendanceCounts, popular] =
    await Promise.all([
      Event.countDocuments(eventFilter),
      EventRegistration.countDocuments({
        ...regFilter,
        status: { $in: [REGISTRATION_STATUS.REGISTERED, REGISTRATION_STATUS.WAITLISTED] },
      }),
      EventRegistration.countDocuments(regFilter),
      EventRegistration.countDocuments({ ...regFilter, status: REGISTRATION_STATUS.CANCELLED }),
      EventRegistration.aggregate([
        { $match: { ...regFilter, status: REGISTRATION_STATUS.REGISTERED } },
        { $group: { _id: '$attendanceStatus', count: { $sum: 1 } } },
      ]),
      EventRegistration.aggregate([
        { $match: { ...regFilter, status: REGISTRATION_STATUS.REGISTERED } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

  const attended = attendanceCounts.find((a) => a._id === ATTENDANCE_STATUS.ATTENDED)?.count || 0;
  const noShow = attendanceCounts.find((a) => a._id === ATTENDANCE_STATUS.NO_SHOW)?.count || 0;

  const popularEvents = await Event.find({ _id: { $in: popular.map((p) => p._id) } })
    .select('title slug')
    .lean();
  const mostPopularEvents = popular.map((p) => ({
    event: popularEvents.find((e) => e._id.equals(p._id)),
    registeredCount: p.count,
  }));

  return {
    totalEvents,
    totalRegistrations,
    attendanceRate: attendanceRateFrom(attended, noShow),
    cancellationRate: totalRegDocs === 0 ? null : cancelledCount / totalRegDocs,
    mostPopularEvents,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Numbers for the manager dashboard's KPI row. Same scoping as getOrgAnalytics: null
// scopeToUserId = admin (org-wide), otherwise only events the user created or organizes.
//
// Every figure is a real count — nothing here is a comparison against a snapshot that doesn't
// exist. "Upcoming events" is a stock, so it gets no month-over-month delta; the two figures that
// do (events per month, new sign-ups per month) are flows that can be recomputed for any window.
// `now` is injectable so month boundaries can be tested against a fixed clock.
export async function getDashboardSummary(
  organizationId,
  { scopeToUserId, canManageInvites, timeZone, now = new Date() }
) {
  const eventIds = await resolveScopedEventIds(organizationId, scopeToUserId);
  const eventFilter = eventIds ? { _id: { $in: eventIds } } : { organization: organizationId };
  const regFilter = eventIds ? { event: { $in: eventIds } } : { organization: organizationId };
  const published = { ...eventFilter, status: EVENT_STATUS.PUBLISHED };

  const { lastStart, thisStart, nextStart } = monthBoundsInZone(now, timeZone);
  const weekEnd = new Date(now.getTime() + 7 * DAY_MS);
  const registered = { ...regFilter, status: REGISTRATION_STATUS.REGISTERED };

  const [
    upcomingEvents,
    startingNext7Days,
    drafts,
    eventsThisMonth,
    eventsLastMonth,
    registeredAttendees,
    newRegistrationsThisMonth,
    newRegistrationsLastMonth,
    pendingInvites,
  ] = await Promise.all([
    Event.countDocuments({ ...published, startsAt: { $gt: now } }),
    Event.countDocuments({ ...published, startsAt: { $gt: now, $lte: weekEnd } }),
    Event.countDocuments({ ...eventFilter, status: EVENT_STATUS.DRAFT }),
    Event.countDocuments({ ...published, startsAt: { $gte: thisStart, $lt: nextStart } }),
    Event.countDocuments({ ...published, startsAt: { $gte: lastStart, $lt: thisStart } }),
    EventRegistration.countDocuments(registered),
    EventRegistration.countDocuments({ ...registered, registeredAt: { $gte: thisStart, $lt: nextStart } }),
    EventRegistration.countDocuments({ ...registered, registeredAt: { $gte: lastStart, $lt: thisStart } }),
    // Invites are an org-level admin concern: null (not 0) when the caller can't manage them, so
    // the client can tell "hidden from you" apart from "none pending".
    canManageInvites
      ? Invite.countDocuments({
          organization: organizationId,
          status: INVITE_STATUS.PENDING,
          expiresAt: { $gt: now },
        })
      : null,
  ]);

  return {
    upcomingEvents,
    startingNext7Days,
    registeredAttendees,
    newRegistrationsThisMonth,
    newRegistrationsLastMonth,
    eventsThisMonth,
    eventsLastMonth,
    pendingActions: { total: drafts + (pendingInvites ?? 0), drafts, pendingInvites },
  };
}

export async function getEventAnalytics(event) {
  const [registeredCount, waitlistedCount, cancelledCount, attendanceCounts, timeline] = await Promise.all([
    EventRegistration.countDocuments({ event: event._id, status: REGISTRATION_STATUS.REGISTERED }),
    EventRegistration.countDocuments({ event: event._id, status: REGISTRATION_STATUS.WAITLISTED }),
    EventRegistration.countDocuments({ event: event._id, status: REGISTRATION_STATUS.CANCELLED }),
    EventRegistration.aggregate([
      { $match: { event: event._id, status: REGISTRATION_STATUS.REGISTERED } },
      { $group: { _id: '$attendanceStatus', count: { $sum: 1 } } },
    ]),
    EventRegistration.aggregate([
      { $match: { event: event._id } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$registeredAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const attended = attendanceCounts.find((a) => a._id === ATTENDANCE_STATUS.ATTENDED)?.count || 0;
  const noShow = attendanceCounts.find((a) => a._id === ATTENDANCE_STATUS.NO_SHOW)?.count || 0;
  const totalRegDocs = registeredCount + waitlistedCount + cancelledCount;

  return {
    registeredCount,
    waitlistedCount,
    cancelledCount,
    capacityUtilization: event.capacity > 0 ? registeredCount / event.capacity : 0,
    attendanceRate: attendanceRateFrom(attended, noShow),
    cancellationRate: totalRegDocs === 0 ? null : cancelledCount / totalRegDocs,
    registrationTimeline: timeline.map((t) => ({ date: t._id, count: t.count })),
  };
}
