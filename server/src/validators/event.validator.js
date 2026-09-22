import { z } from 'zod';
import { objectId } from './common.js';
import { paginationQuerySchema } from '../utils/paginate.js';
import { EVENT_STATUS_VALUES } from '../constants/eventStatus.js';

export { orgParamsSchema as eventOrgParamsSchema } from './organization.validator.js';

export const eventParamsSchema = z.object({ eventId: objectId });

const venueSchema = z
  .object({
    name: z.string().trim().max(200).optional(),
    address: z.string().trim().max(300).optional(),
    room: z.string().trim().max(100).optional(),
    mapUrl: z.union([z.string().trim().url(), z.literal('')]).optional(),
  })
  .optional();

// Deliberately excludes status/slug/organization/createdBy/publishedAt — zod's default "strip"
// behavior drops any of those if a client sends them, so status can only ever change through the
// dedicated publish/cancel endpoints, never a plain create/update body.
const eventFields = {
  title: z.string().trim().min(2, 'Title is too short').max(200),
  description: z.string().trim().max(5000).optional(),
  category: z.string().trim().max(60).optional(),
  coverImage: z.string().trim().url().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  startTime: z.string().trim().max(20).optional(),
  endTime: z.string().trim().max(20).optional(),
  timezone: z.string().trim().max(60).optional(),
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
  status: z.enum(EVENT_STATUS_VALUES).optional(),
  organizer: objectId.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const duplicateEventSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .optional();
