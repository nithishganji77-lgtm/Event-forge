import { Event } from '../models/Event.js';
import { EventRegistration } from '../models/EventRegistration.js';
import { REGISTRATION_STATUS, ATTENDANCE_STATUS } from '../constants/eventStatus.js';

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
