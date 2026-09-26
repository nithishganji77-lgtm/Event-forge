import { z } from 'zod';
import { isValidTimeZone } from '../utils/eventTime.js';

// "HH:mm" 24-hour (what <input type="time"> produces) or '' for "not set". Mirrors the server.
const timeOfDay = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a valid time')
  .or(z.literal(''));

const venueSchema = z.object({
  name: z.string().trim().max(200).optional(),
  address: z.string().trim().max(300).optional(),
  room: z.string().trim().max(100).optional(),
  // http(s) only, like the server: a map link becomes an <a href>, and a javascript: URL passes
  // a generic URL check.
  mapUrl: z
    .union([
      z.string().trim().url('Enter a valid URL').refine((value) => /^https?:\/\//i.test(value), 'Use an http:// or https:// link'),
      z.literal(''),
    ])
    .optional(),
});

// Mirrors server/src/validators/event.validator.js's eventFields — UX-only mirror, same
// convention as utils/permissions.js; the backend remains authoritative.
export const eventFormSchema = z
  .object({
    title: z.string().trim().min(2, 'Give the event a name (at least 2 characters)').max(200),
    description: z.string().trim().max(5000).optional(),
    category: z.string().trim().max(60).optional(),
    startDate: z.string().min(1, 'Choose a start date'),
    endDate: z.string().min(1, 'Choose an end date'),
    startTime: timeOfDay.optional(),
    endTime: timeOfDay.optional(),
    timezone: z
      .string()
      .trim()
      .max(60)
      .refine((zone) => zone === '' || isValidTimeZone(zone), 'Pick a valid timezone')
      .optional(),
    venue: venueSchema.optional(),
    capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
    registrationDeadline: z.string().optional().or(z.literal('')),
    organizers: z.array(z.string()).optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  })
  .refine(
    (data) =>
      !(data.startTime && data.endTime) || data.endDate !== data.startDate || data.endTime >= data.startTime,
    { message: 'End time must not be before the start time', path: ['endTime'] }
  )
  .refine(
    (data) =>
      !data.registrationDeadline || new Date(data.registrationDeadline) <= new Date(data.startDate),
    { message: 'Registration deadline must be before the event starts', path: ['registrationDeadline'] }
  );

// Drives per-step "Next" validation (react-hook-form's trigger()) against the one shared schema
// above, instead of duplicating cross-field refines across 5 separate step schemas.
export const STEP_FIELDS = {
  basicInfo: ['title', 'description', 'category'],
  dateVenue: ['startDate', 'endDate', 'startTime', 'endTime', 'timezone', 'venue'],
  capacity: ['capacity', 'registrationDeadline'],
  organizers: ['organizers'],
  review: [],
};

export const EVENT_CATEGORIES = ['General', 'Conference', 'Workshop', 'Webinar', 'Team Offsite', 'Social'];

export const eventFormDefaults = {
  title: '',
  description: '',
  category: 'General',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  timezone: 'Asia/Kolkata',
  venue: { name: '', address: '', room: '', mapUrl: '' },
  capacity: 50,
  registrationDeadline: '',
  organizers: [],
};
