import { z } from 'zod';
import { objectId, httpUrl } from './common.js';
import { paginationQuerySchema } from '../utils/paginate.js';
import { EVENT_STATUS_FILTER_VALUES } from '../constants/eventStatus.js';
import { isValidTimeOfDay, isValidTimeZone } from '../utils/eventTime.js';

export { orgParamsSchema as eventOrgParamsSchema } from './organization.validator.js';

export const eventParamsSchema = z.object({ eventId: objectId });

const venueSchema = z
  .object({
    name: z.string().trim().max(200).optional(),
    address: z.string().trim().max(300).optional(),
    room: z.string().trim().max(100).optional(),
    mapUrl: z.union([httpUrl, z.literal('')]).optional(),
  })
  .optional();

// "HH:mm" 24-hour wall-clock time (what <input type="time"> produces) or '' for "not set".
const timeOfDay = z.string().trim().refine(isValidTimeOfDay, 'Use a 24-hour HH:mm time');

// Deliberately excludes status/slug/organization/createdBy/publishedAt — zod's default "strip"
// behavior drops any of those if a client sends them, so status can only ever change through the
// dedicated publish/cancel endpoints, never a plain create/update body. The same goes for
// startsAt/endsAt/registrationClosesAt, which the Event model derives itself.
const eventFields = {
  title: z.string().trim().min(2, 'Title is too short').max(200),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().max(60).optional(),
  coverImage: httpUrl.optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  startTime: timeOfDay.optional(),
  endTime: timeOfDay.optional(),
  timezone: z.string().trim().max(60).refine(isValidTimeZone, 'Unknown timezone').optional(),
  venue: venueSchema,
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  registrationDeadline: z.coerce.date().nullable().optional(),
  organizers: z.array(objectId).optional(),
};

function withCrossFieldRefines(schema) {
  return schema
    .refine((data) => !(data.startDate && data.endDate) || data.endDate >= data.startDate, {
      message: 'End date must be on or after the start date',
      path: ['endDate'],
    })
    .refine(
      (data) =>
        !(data.startDate && data.endDate && data.startTime && data.endTime) ||
        data.endDate.getTime() !== data.startDate.getTime() ||
        data.endTime >= data.startTime,
      { message: 'End time must not be before the start time', path: ['endTime'] }
    )
    .refine(
      (data) =>
        !(data.registrationDeadline && data.startDate) ||
        data.registrationDeadline <= data.startDate,
      {
        message: 'Registration deadline must be before the event starts',
        path: ['registrationDeadline'],
      }
    );
}

export const createEventSchema = withCrossFieldRefines(z.object(eventFields));
export const updateEventSchema = withCrossFieldRefines(z.object(eventFields).partial());

export const listEventsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  status: z.enum(EVENT_STATUS_FILTER_VALUES).optional(),
  organizer: objectId.optional(),
  // Calendar-date window on startDate (the UTC-midnight of the picked date), not on startsAt.
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sort: z.enum(['startsAt_asc', 'startsAt_desc']).optional(),
});

export const duplicateEventSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .optional();
