import { z } from 'zod';
import { objectId } from './common.js';
import { paginationQuerySchema } from '../utils/paginate.js';
import { REGISTRATION_STATUS_VALUES, ATTENDANCE_STATUS_VALUES } from '../constants/eventStatus.js';

export { eventParamsSchema } from './event.validator.js';

export const listRegistrationsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(REGISTRATION_STATUS_VALUES).optional(),
  // Matches the attendee's name or email.
  search: z.string().trim().max(120).optional(),
});

export const markAttendanceParamsSchema = z.object({
  eventId: objectId,
  registrationId: objectId,
});

export const markAttendanceSchema = z.object({
  attendanceStatus: z.enum(ATTENDANCE_STATUS_VALUES),
});
