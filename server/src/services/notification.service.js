import { Notification } from '../models/Notification.js';
import { OrganizationMember } from '../models/OrganizationMember.js';
import { EventRegistration } from '../models/EventRegistration.js';
import { MEMBER_STATUS } from '../constants/roles.js';
import { REGISTRATION_STATUS } from '../constants/eventStatus.js';
import { NOTIFICATION_TYPES } from '../constants/notificationTypes.js';
import { logger } from '../config/logger.js';
import { ApiError } from '../utils/ApiError.js';
import { toSkipLimit } from '../utils/paginate.js';

// Same defensive posture as audit.service.js: writeAuditLog — never throws, so a notification
// failure never fails the action that triggered it. Batches via insertMany for the fan-out cases
// (event published/updated/cancelled, deadline approaching all notify multiple recipients).
export async function notify({
  recipients,
  organization,
  type,
  title,
  message,
  relatedEntityType = null,
  relatedEntityId = null,
  metadata = {},
}) {
  const ids = (Array.isArray(recipients) ? recipients : [recipients]).filter(Boolean);
  if (ids.length === 0) return;

  try {
    await Notification.insertMany(
      ids.map((recipient) => ({
        recipient,
        organization,
        type,
        title,
        message,
        relatedEntityType,
        relatedEntityId,
        metadata,
      })),
      { ordered: false }
    );
  } catch (err) {
    logger.error({ err, type, relatedEntityType }, 'Failed to write notification(s)');
  }
}

async function activeMemberUserIds(organizationId, excludeUserId = null) {
  const members = await OrganizationMember.find({
    organization: organizationId,
    status: MEMBER_STATUS.ACTIVE,
  }).select('user');
  return members
    .map((m) => m.user)
    .filter((id) => !excludeUserId || String(id) !== String(excludeUserId));
}

async function activeRegistrantUserIds(eventId, excludeUserId = null) {
  const registrations = await EventRegistration.find({
    event: eventId,
    status: { $in: [REGISTRATION_STATUS.REGISTERED, REGISTRATION_STATUS.WAITLISTED] },
  }).select('user');
  return registrations
    .map((r) => r.user)
    .filter((id) => !excludeUserId || String(id) !== String(excludeUserId));
}

// Audience: every active org member except the actor — announces a newly-available event to the
// people who can now register (organizers already know they just published it).
export async function notifyEventPublished(event, actorUserId) {
  const recipients = await activeMemberUserIds(event.organization, actorUserId);
  await notify({
    recipients,
    organization: event.organization,
    type: NOTIFICATION_TYPES.EVENT_PUBLISHED,
    title: 'New event published',
    message: `"${event.title}" is now open for registration.`,
    relatedEntityType: 'Event',
    relatedEntityId: event._id,
  });
}

// Audience: only people with an active (registered/waitlisted) registration for this specific
// event, not every org member — deliberately narrower than notifyEventPublished.
export async function notifyEventUpdated(event, actorUserId) {
  const recipients = await activeRegistrantUserIds(event._id, actorUserId);
  await notify({
    recipients,
    organization: event.organization,
    type: NOTIFICATION_TYPES.EVENT_UPDATED,
    title: 'Event details updated',
    message: `"${event.title}" was updated — review the latest details.`,
    relatedEntityType: 'Event',
    relatedEntityId: event._id,
  });
}

export async function notifyEventCancelled(event, actorUserId) {
  const recipients = await activeRegistrantUserIds(event._id, actorUserId);
  await notify({
    recipients,
    organization: event.organization,
    type: NOTIFICATION_TYPES.EVENT_CANCELLED,
    title: 'Event cancelled',
    message: `"${event.title}" has been cancelled.`,
    relatedEntityType: 'Event',
    relatedEntityId: event._id,
  });
}

// Audience: the acting user only (confirmation of their own action). Reused for waitlist
// auto-promotion with promotedFromWaitlist:true, distinct copy for that case.
export async function notifyRegistrationConfirmed(registration, event, { promotedFromWaitlist = false } = {}) {
  await notify({
    recipients: registration.user,
    organization: event.organization,
    type: NOTIFICATION_TYPES.REGISTRATION_CONFIRMED,
    title: promotedFromWaitlist ? "You're off the waitlist" : 'Registration confirmed',
    message: promotedFromWaitlist
      ? `A spot opened up — you're now registered for "${event.title}".`
      : `You're registered for "${event.title}".`,
    // Points at the Event, not the EventRegistration — there's no standalone registration page
    // to link to, and "go to this event" is what's actually useful to click through to.
    relatedEntityType: 'Event',
    relatedEntityId: event._id,
    metadata: { promotedFromWaitlist },
  });
}

export async function notifyRegistrationWaitlisted(registration, event) {
  await notify({
    recipients: registration.user,
    organization: event.organization,
    type: NOTIFICATION_TYPES.REGISTRATION_WAITLISTED,
    title: "You're on the waitlist",
    message: `"${event.title}" is at capacity — you've been added to the waitlist.`,
    relatedEntityType: 'Event',
    relatedEntityId: event._id,
  });
}

export async function notifyRegistrationCancelled(registration, event) {
  await notify({
    recipients: registration.user,
    organization: event.organization,
    type: NOTIFICATION_TYPES.REGISTRATION_CANCELLED,
    title: 'Registration cancelled',
    message: `Your registration for "${event.title}" was cancelled.`,
    relatedEntityType: 'Event',
    relatedEntityId: event._id,
  });
}

// Audience: active members who do NOT already hold an active registration for this event — the
// point of a registration-deadline reminder is to prompt action from people who haven't acted;
// someone already registered has nothing left to do.
export async function notifyDeadlineApproaching(event) {
  const [activeMembers, alreadyRegistered] = await Promise.all([
    activeMemberUserIds(event.organization),
    EventRegistration.find({
      event: event._id,
      status: { $in: [REGISTRATION_STATUS.REGISTERED, REGISTRATION_STATUS.WAITLISTED] },
    }).distinct('user'),
  ]);
  const registeredSet = new Set(alreadyRegistered.map(String));
  const recipients = activeMembers.filter((id) => !registeredSet.has(String(id)));

  await notify({
    recipients,
    organization: event.organization,
    type: NOTIFICATION_TYPES.DEADLINE_APPROACHING,
    title: 'Registration closing soon',
    message: `Registration for "${event.title}" closes soon — register before it's too late.`,
    relatedEntityType: 'Event',
    relatedEntityId: event._id,
  });
}

export async function listMyNotifications(userId, { page, limit, unreadOnly }) {
  const filter = { recipient: userId };
  if (unreadOnly) filter.read = false;

  const { skip, limit: take } = toSkipLimit({ page, limit });
  const [data, total] = await Promise.all([
    Notification.find(filter)
      .populate('organization', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return { data, total };
}

// Ownership enforced by a scoped query filter, not middleware — same precedent as
// me.controller.js: listMyEventsHandler baking req.user._id directly into its filter. 404 (not a
// leaked "exists under someone else") if the id is wrong or belongs to another user.
export async function markNotificationRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { read: true, readAt: new Date() },
    { new: true }
  );
  if (!notification) throw ApiError.notFound("We couldn't find that notification.");
  return notification;
}

export async function markAllNotificationsRead(userId) {
  await Notification.updateMany({ recipient: userId, read: false }, { read: true, readAt: new Date() });
}
