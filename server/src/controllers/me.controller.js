import { OrganizationMember } from '../models/OrganizationMember.js';
import { MEMBER_STATUS } from '../constants/roles.js';
import { listMyEvents } from '../services/registration.service.js';
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notification.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess, sendPaginated } from '../utils/ApiResponse.js';

export const listMyEventsHandler = asyncHandler(async (req, res) => {
  const memberships = await OrganizationMember.find({
    user: req.user._id,
    status: MEMBER_STATUS.ACTIVE,
  }).select('organization');

  const registrations = await listMyEvents(
    req.user._id,
    memberships.map((m) => m.organization)
  );

  return sendSuccess(res, { data: { registrations } });
});

export const listMyNotificationsHandler = asyncHandler(async (req, res) => {
  const { page, limit, unreadOnly } = req.query;
  const { data, total } = await listMyNotifications(req.user._id, { page, limit, unreadOnly });
  return sendPaginated(res, { data, page, limit, total });
});

export const markNotificationReadHandler = asyncHandler(async (req, res) => {
  const notification = await markNotificationRead(req.user._id, req.params.notificationId);
  return sendSuccess(res, { message: 'Notification marked as read', data: { notification } });
});

export const markAllNotificationsReadHandler = asyncHandler(async (req, res) => {
  await markAllNotificationsRead(req.user._id);
  return sendSuccess(res, { message: 'All notifications marked as read' });
});
