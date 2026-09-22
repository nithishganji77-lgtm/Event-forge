import slugify from 'slugify';
import { Event } from '../models/Event.js';
import { EventRegistration } from '../models/EventRegistration.js';
import { OrganizationMember } from '../models/OrganizationMember.js';
import { MEMBER_STATUS } from '../constants/roles.js';
import { EVENT_STATUS, REGISTRATION_STATUS } from '../constants/eventStatus.js';
import { computeDisplayStatus, statusFilterToQuery } from '../utils/eventStatus.js';
import { escapeRegex } from '../utils/paginate.js';
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
    throw ApiError.badRequest('Organizers must be active members of this organization');
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

export async function listEvents(organizationId, { page, limit, search, category, status, organizer, dateFrom, dateTo }) {
  const filter = { organization: organizationId };
  if (category) filter.category = category;
  if (organizer) filter.$or = [{ createdBy: organizer }, { organizers: organizer }];
  if (search) filter.title = new RegExp(escapeRegex(search), 'i');
  if (dateFrom || dateTo) {
    filter.startDate = {};
    if (dateFrom) filter.startDate.$gte = dateFrom;
    if (dateTo) filter.startDate.$lte = dateTo;
  }
  if (status) Object.assign(filter, statusFilterToQuery(status));

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort({ startDate: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Event.countDocuments(filter),
  ]);

  const data = await Promise.all(events.map((event) => attachStats(event)));
  return { data, total };
}

export async function getEventDetail(event, viewerUserId) {
  return attachStats(event, viewerUserId);
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
    throw ApiError.conflict('A cancelled event cannot be published');
  }
  if (event.status === EVENT_STATUS.PUBLISHED) {
    throw ApiError.conflict('This event is already published');
  }
  if (event.startDate <= new Date()) {
    throw ApiError.badRequest('Start date must be in the future to publish');
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
