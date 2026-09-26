import slugify from 'slugify';
import { Event } from '../models/Event.js';
import { EventRegistration } from '../models/EventRegistration.js';
import { OrganizationMember } from '../models/OrganizationMember.js';
import { User } from '../models/User.js';
import { MEMBER_STATUS } from '../constants/roles.js';
import { EVENT_STATUS, REGISTRATION_STATUS } from '../constants/eventStatus.js';
import { computeDisplayStatus, statusFilterToQuery } from '../utils/eventStatus.js';
import { escapeRegex, toSkipLimit } from '../utils/paginate.js';
import { ApiError } from '../utils/ApiError.js';

export async function generateEventSlug(organizationId, title) {
  const base = slugify(title, { lower: true, strict: true }) || 'event';
  let candidate = base;
  let suffix = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Event.exists({ organization: organizationId, slug: candidate })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

// An ORGANIZER shouldn't be able to list an arbitrary/non-member user id as a co-organizer.
export async function validateOrganizers(organizationId, organizerIds = []) {
  if (organizerIds.length === 0) return;
  const activeCount = await OrganizationMember.countDocuments({
    organization: organizationId,
    user: { $in: organizerIds },
    status: MEMBER_STATUS.ACTIVE,
  });
  if (activeCount !== new Set(organizerIds.map(String)).size) {
    throw ApiError.badRequest('Organizers must be active members of this organization.', [
      { path: 'organizers', message: 'Organizers must be active members of this organization.' },
    ]);
  }
}

export async function attachStats(event, viewerUserId) {
  const plain = event.toObject ? event.toObject() : event;
  const [registeredCount, waitlistedCount, myRegistration] = await Promise.all([
    EventRegistration.countDocuments({ event: plain._id, status: REGISTRATION_STATUS.REGISTERED }),
    EventRegistration.countDocuments({ event: plain._id, status: REGISTRATION_STATUS.WAITLISTED }),
    viewerUserId
      ? EventRegistration.findOne({ event: plain._id, user: viewerUserId }).lean()
      : null,
  ]);

  return {
    ...plain,
    displayStatus: computeDisplayStatus(plain),
    registeredCount,
    waitlistedCount,
    myRegistrationStatus:
      myRegistration && myRegistration.status !== REGISTRATION_STATUS.CANCELLED
        ? myRegistration.status
        : null,
  };
}

export async function createEvent({ organization, data, createdBy }) {
  await validateOrganizers(organization, data.organizers);
  const slug = await generateEventSlug(organization, data.title);
  return Event.create({ ...data, organization, slug, createdBy });
}

const SORT_DIRECTIONS = { startsAt_asc: 1, startsAt_desc: -1 };

// Every condition is its own `$and` clause so none can overwrite another — the status fragment
// carries its own keys (and, for REGISTRATION_OPEN, its own `$or`), which used to clobber the
// organizer `$or` and any date window when merged into one flat object. dateFrom/dateTo stay a
// calendar-date window on startDate (the UTC-midnight of the picked date); status filters compare
// startsAt/endsAt, so the two never share a key.
export async function listEvents(
  organizationId,
  { page, limit, search, category, status, organizer, dateFrom, dateTo, sort = 'startsAt_asc' }
) {
  const clauses = [{ organization: organizationId }];
  if (category) clauses.push({ category });
  if (organizer) clauses.push({ $or: [{ createdBy: organizer }, { organizers: organizer }] });
  if (search) clauses.push({ title: new RegExp(escapeRegex(search), 'i') });
  if (dateFrom || dateTo) {
    const range = {};
    if (dateFrom) range.$gte = dateFrom;
    if (dateTo) range.$lte = dateTo;
    clauses.push({ startDate: range });
  }
  if (status) clauses.push(statusFilterToQuery(status));
  const filter = { $and: clauses };

  // _id tiebreak: same-day events share startDate and can share startsAt, so paging is otherwise
  // unstable between requests.
  const direction = SORT_DIRECTIONS[sort] ?? 1;
  const { skip, limit: take } = toSkipLimit({ page, limit });
  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ startsAt: direction, _id: direction })
      .skip(skip)
      .limit(take),
    Event.countDocuments(filter),
  ]);

  const data = await Promise.all(events.map((event) => attachStats(event)));
  return { data, total };
}

// The people behind an event, as profiles: the creator first, then each listed organizer. The event
// itself keeps `createdBy` / `organizers` as plain ids (the client's ownership checks compare
// them), so this is a separate field. Detail only: a list of 20 events would otherwise pay a user
// lookup each. Name, email and avatar are what the members list already shows every member.
async function loadPeople(event) {
  const ids = [event.createdBy, ...(event.organizers ?? [])].map(String);
  const unique = [...new Set(ids)];
  const users = await User.find({ _id: { $in: unique } }).select('name email avatar').lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  return unique
    .filter((id) => byId.has(id))
    .map((id) => ({ ...byId.get(id), role: id === String(event.createdBy) ? 'CREATOR' : 'ORGANIZER' }));
}

export async function getEventDetail(event, viewerUserId) {
  const [detail, people] = await Promise.all([attachStats(event, viewerUserId), loadPeople(event)]);
  return { ...detail, people };
}

export async function updateEvent(event, updates) {
  if (updates.organizers) {
    await validateOrganizers(event.organization, updates.organizers);
  }
  Object.assign(event, updates);
  await event.save();
  return event;
}

export async function publishEvent(event) {
  if (event.status === EVENT_STATUS.CANCELLED) {
    throw ApiError.conflict("This event was cancelled, so it can't be published. Duplicate it to start a new one.");
  }
  if (event.status === EVENT_STATUS.PUBLISHED) {
    throw ApiError.conflict('This event is already published.');
  }
  // Compares the real start instant (date + time + timezone), so a same-day event that hasn't
  // started yet can be published. `?? startDate` only covers a not-yet-backfilled legacy row.
  if ((event.startsAt ?? event.startDate) <= new Date()) {
    throw ApiError.badRequest('This event has already started, so it can\'t be published. Change its date or time first.');
  }
  event.status = EVENT_STATUS.PUBLISHED;
  event.publishedAt = new Date();
  await event.save();
  return event;
}

// Does not cascade-cancel existing registrations — they stay on record for history;
// REGISTRATION_CLOSED (derived from status=CANCELLED) already blocks any new ones.
export async function cancelEvent(event) {
  event.status = EVENT_STATUS.CANCELLED;
  await event.save();
  return event;
}

export async function deleteEvent(event) {
  await EventRegistration.deleteMany({ event: event._id });
  await event.deleteOne();
}

export async function duplicateEvent(sourceEvent, user, overrides = {}) {
  const title = `${sourceEvent.title} (Copy)`;
  const slug = await generateEventSlug(sourceEvent.organization, title);

  return Event.create({
    organization: sourceEvent.organization,
    title,
    slug,
    description: sourceEvent.description,
    coverImage: sourceEvent.coverImage,
    category: sourceEvent.category,
    status: EVENT_STATUS.DRAFT,
    startDate: overrides.startDate || sourceEvent.startDate,
    endDate: overrides.endDate || sourceEvent.endDate,
    startTime: sourceEvent.startTime,
    endTime: sourceEvent.endTime,
    timezone: sourceEvent.timezone,
    venue: sourceEvent.venue,
    capacity: sourceEvent.capacity,
    registrationDeadline: sourceEvent.registrationDeadline,
    organizers: sourceEvent.organizers,
    createdBy: user._id,
  });
}

export async function setCoverImage(event, url) {
  event.coverImage = url;
  await event.save();
  return event;
}
