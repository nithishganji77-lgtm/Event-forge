import {
  createEvent,
  listEvents,
  getEventDetail,
  updateEvent as updateEventService,
  publishEvent as publishEventService,
  cancelEvent as cancelEventService,
  deleteEvent as deleteEventService,
  duplicateEvent as duplicateEventService,
  setCoverImage,
} from '../services/event.service.js';
import { storage } from '../services/storage/index.js';
import { writeAuditLog, eventAuditMetadata } from '../services/audit.service.js';
import {
  notifyEventPublished,
  notifyEventUpdated,
  notifyEventCancelled,
} from '../services/notification.service.js';
import { AUDIT_ACTIONS } from '../constants/auditActions.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendPaginated, sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

export const listEventsHandler = asyncHandler(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const { data, total } = await listEvents(req.organization._id, { page, limit, ...filters });
  return sendPaginated(res, { data, page, limit, total });
});

export const createEventHandler = asyncHandler(async (req, res) => {
  const event = await createEvent({
    organization: req.organization._id,
    data: req.body,
    createdBy: req.user._id,
  });

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.EVENT_CREATED,
    entityType: 'Event',
    entityId: event._id,
    metadata: eventAuditMetadata(event),
    req,
  });

  return sendSuccess(res, { statusCode: 201, message: 'Event created successfully', data: { event } });
});

export const getEventHandler = asyncHandler(async (req, res) => {
  const event = await getEventDetail(req.event, req.user._id);
  return sendSuccess(res, { data: { event } });
});

export const updateEventHandler = asyncHandler(async (req, res) => {
  const event = await updateEventService(req.event, req.body);

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.EVENT_UPDATED,
    entityType: 'Event',
    entityId: event._id,
    metadata: eventAuditMetadata(event, { fields: Object.keys(req.body) }),
    req,
  });
  await notifyEventUpdated(event, req.user._id);

  return sendSuccess(res, { message: 'Event updated successfully', data: { event } });
});

export const deleteEventHandler = asyncHandler(async (req, res) => {
  const eventId = req.event._id;

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.EVENT_DELETED,
    entityType: 'Event',
    entityId: eventId,
    metadata: eventAuditMetadata(req.event),
    req,
  });

  await deleteEventService(req.event);
  return sendSuccess(res, { message: 'Event deleted successfully' });
});

export const publishEventHandler = asyncHandler(async (req, res) => {
  const event = await publishEventService(req.event);

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.EVENT_PUBLISHED,
    entityType: 'Event',
    entityId: event._id,
    metadata: eventAuditMetadata(event),
    req,
  });
  await notifyEventPublished(event, req.user._id);

  return sendSuccess(res, { message: 'Event published successfully', data: { event } });
});

export const cancelEventHandler = asyncHandler(async (req, res) => {
  const event = await cancelEventService(req.event);

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.EVENT_CANCELLED,
    entityType: 'Event',
    entityId: event._id,
    metadata: eventAuditMetadata(event),
    req,
  });
  await notifyEventCancelled(event, req.user._id);

  return sendSuccess(res, { message: 'Event cancelled successfully', data: { event } });
});

export const duplicateEventHandler = asyncHandler(async (req, res) => {
  const duplicate = await duplicateEventService(req.event, req.user, req.body);

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.EVENT_DUPLICATED,
    entityType: 'Event',
    entityId: duplicate._id,
    metadata: eventAuditMetadata(duplicate, { sourceEventId: req.event._id }),
    req,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Event duplicated successfully',
    data: { event: duplicate },
  });
});

export const uploadCoverImageHandler = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image to upload.');

  const { url } = await storage.upload(req.file.buffer, {
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
  });
  const event = await setCoverImage(req.event, url);

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.EVENT_UPDATED,
    entityType: 'Event',
    entityId: event._id,
    metadata: eventAuditMetadata(event, { field: 'coverImage' }),
    req,
  });

  return sendSuccess(res, { message: 'Cover image updated successfully', data: { event } });
});
