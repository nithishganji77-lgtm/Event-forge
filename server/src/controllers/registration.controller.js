import {
  registerForEvent,
  cancelRegistration,
  listRegistrations,
  markAttendance,
} from '../services/registration.service.js';
import { REGISTRATION_STATUS } from '../constants/eventStatus.js';
import { writeAuditLog } from '../services/audit.service.js';
import {
  notifyRegistrationConfirmed,
  notifyRegistrationWaitlisted,
  notifyRegistrationCancelled,
} from '../services/notification.service.js';
import { AUDIT_ACTIONS } from '../constants/auditActions.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendPaginated, sendSuccess } from '../utils/ApiResponse.js';

export const registerHandler = asyncHandler(async (req, res) => {
  const registration = await registerForEvent(req.event, req.user);

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action:
      registration.status === REGISTRATION_STATUS.WAITLISTED
        ? AUDIT_ACTIONS.REGISTRATION_WAITLISTED
        : AUDIT_ACTIONS.REGISTRATION_CREATED,
    entityType: 'EventRegistration',
    entityId: registration._id,
    req,
  });

  if (registration.status === REGISTRATION_STATUS.WAITLISTED) {
    await notifyRegistrationWaitlisted(registration, req.event);
  } else {
    await notifyRegistrationConfirmed(registration, req.event);
  }

  return sendSuccess(res, {
    statusCode: 201,
    message:
      registration.status === REGISTRATION_STATUS.WAITLISTED
        ? "You've been added to the waitlist"
        : "You're registered for this event",
    data: { registration },
  });
});

export const cancelRegistrationHandler = asyncHandler(async (req, res) => {
  const { cancelled, promoted } = await cancelRegistration(req.event, req.user);

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.REGISTRATION_CANCELLED,
    entityType: 'EventRegistration',
    entityId: cancelled._id,
    req,
  });
  await notifyRegistrationCancelled(cancelled, req.event);

  if (promoted) {
    await writeAuditLog({
      organization: req.organization._id,
      actor: req.user._id,
      action: AUDIT_ACTIONS.REGISTRATION_CREATED,
      entityType: 'EventRegistration',
      entityId: promoted._id,
      metadata: { promotedFromWaitlist: true },
      req,
    });
    await notifyRegistrationConfirmed(promoted, req.event, { promotedFromWaitlist: true });
  }

  return sendSuccess(res, { message: 'Registration cancelled successfully' });
});

export const listRegistrationsHandler = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const { data, total } = await listRegistrations(req.event._id, { page, limit, status });
  return sendPaginated(res, { data, page, limit, total });
});

export const markAttendanceHandler = asyncHandler(async (req, res) => {
  const { attendanceStatus } = req.body;
  const registration = await markAttendance(req.event._id, req.params.registrationId, attendanceStatus);

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.ATTENDANCE_MARKED,
    entityType: 'EventRegistration',
    entityId: registration._id,
    metadata: { attendanceStatus },
    req,
  });

  return sendSuccess(res, { message: 'Attendance updated successfully', data: { registration } });
});
