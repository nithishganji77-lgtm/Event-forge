import { z } from 'zod';
import { EVENT_CATEGORIES } from '../../constants/eventCategories.js';
import { clamp, coerceCategory, sanitizeMapsQuery, sanitizeText } from './guardrails.js';

// Each task has two schemas that must agree:
//   jsonSchema  - sent to Gemini, so it answers in this shape (it removes most free-form drift, but
//                 supports only a subset of JSON Schema: no string length limits, for one)
//   parse       - runs on what came back. This is the one that counts: the model's answer is
//                 untrusted, so lengths are capped, tags and links removed, numbers clamped and the
//                 category forced into the list here, whatever the schema promised.

// ---- shared building blocks ----

const text = (max, opts) => z.string().transform((v) => sanitizeText(v, { max, ...opts }));
const required = (max, opts) => text(max, opts).refine((v) => v.length > 0, 'must not be empty');
const int = (min, max) => z.coerce.number().transform((n) => clamp(Math.round(n), min, max));

// "9:30" -> "09:30"; anything that still isn't a 24-hour time fails.
const time = z
  .string()
  .transform((v) => v.trim().replace(/^(\d):/, '0$1:'))
  .refine((v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v), 'must be HH:mm');

const venueIdea = z.object({
  type: required(60),
  name: required(100),
  seating: text(120).default(''),
  mapsQuery: z.string().transform(sanitizeMapsQuery),
});

const agendaItem = z.object({
  day: int(1, 7).default(1),
  time,
  title: required(120),
  details: text(240).default(''),
});

const draftPayload = z.object({
  title: required(120),
  tagline: text(160).default(''),
  category: z.string().transform(coerceCategory),
  description: required(2000, { multiline: true }),
  capacity: int(1, 5000),
  registrationDeadlineDaysBefore: int(0, 60).default(7),
  venueIdeas: z.array(venueIdea).max(4).default([]),
  // A model may list the schedule out of order; sorting is cheaper than failing the request.
  agenda: z
    .array(agendaItem)
    .min(1)
    .max(24)
    .transform((items) => [...items].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))),
});

const conceptsPayload = z
    .array(
      z.object({
        title: required(100),
        tagline: text(140).default(''),
        category: z.string().transform(coerceCategory),
        why: required(300),
        budgetNote: text(200).default(''),
        highlights: z.array(required(120)).max(4).default([]),
      })
    )
    .min(3)
    .transform((items) => items.slice(0, 3));

const venuesPayload = z
    .array(
      z.object({
        type: required(80),
        name: required(100),
        seating: text(120).default(''),
        capacityFit: text(120).default(''),
        mapsQuery: z.string().transform(sanitizeMapsQuery),
        notes: text(240).default(''),
      })
    )
    .min(3)
    .max(5);

const enhancePayload = z.object({
  text: required(5000, { multiline: true }),
  subject: text(150).optional(),
});

// The model may answer `{ status: 'off_topic' }` instead of a payload (see SYSTEM_INSTRUCTION).
// `wrapAs` is for payloads that are a bare list: the answer's `concepts` array comes back to the
// caller as `{ concepts: [...] }`, so every task's result is an object.
function envelope(key, payload, wrapAs) {
  return z
    .object({ status: z.enum(['ok', 'off_topic']), reason: z.string().optional(), [key]: payload.optional() })
    .transform((value) =>
      value.status === 'off_topic'
        ? { status: 'off_topic', reason: sanitizeText(value.reason ?? '', { max: 200 }) }
        : { status: 'ok', value: wrapAs && value[key] !== undefined ? { [wrapAs]: value[key] } : value[key] }
    )
    .refine((value) => value.status === 'off_topic' || value.value !== undefined, 'missing payload');
}

// ---- the JSON schemas Gemini is asked to follow ----

const str = (description) => ({ type: 'string', description });
const statusFields = {
  status: { type: 'string', enum: ['ok', 'off_topic'] },
  reason: str('Only when status is off_topic: one short sentence.'),
};

const venueIdeaJson = {
  type: 'object',
  properties: {
    type: str('Kind of venue, e.g. "Resort with conference hall".'),
    name: str('A generic descriptive name, never a real business.'),
    seating: str('Suggested seating arrangement.'),
    mapsQuery: str('A plain Google Maps search phrase, e.g. "resorts near Bangalore for corporate offsites".'),
  },
  required: ['type', 'name', 'seating', 'mapsQuery'],
};

const DRAFT_JSON = {
  type: 'object',
  properties: {
    ...statusFields,
    draft: {
      type: 'object',
      properties: {
        title: str('Event title.'),
        tagline: str('One-line tagline.'),
        category: { type: 'string', enum: [...EVENT_CATEGORIES] },
        description: str('Professional description, 2 to 4 short paragraphs, plain text.'),
        capacity: { type: 'integer', minimum: 1, maximum: 5000 },
        registrationDeadlineDaysBefore: { type: 'integer', minimum: 0, maximum: 60, description: 'Days before the event that registration should close.' },
        venueIdeas: { type: 'array', maxItems: 4, items: venueIdeaJson },
        agenda: {
          type: 'array',
          maxItems: 24,
          items: {
            type: 'object',
            properties: {
              day: { type: 'integer', minimum: 1, maximum: 7 },
              time: str('24-hour HH:mm.'),
              title: str('Session or activity title.'),
              details: str('One sentence of detail.'),
            },
            required: ['day', 'time', 'title', 'details'],
          },
        },
      },
      required: ['title', 'tagline', 'category', 'description', 'capacity', 'registrationDeadlineDaysBefore', 'venueIdeas', 'agenda'],
    },
  },
  required: ['status'],
};

const CONCEPTS_JSON = {
  type: 'object',
  properties: {
    ...statusFields,
    concepts: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          title: str('Concept title.'),
          tagline: str('One-line tagline.'),
          category: { type: 'string', enum: [...EVENT_CATEGORIES] },
          why: str('Why it suits this team.'),
          budgetNote: str('A rough budget note in the requested or default currency.'),
          highlights: { type: 'array', maxItems: 4, items: { type: 'string' } },
        },
        required: ['title', 'tagline', 'category', 'why', 'budgetNote', 'highlights'],
      },
    },
  },
  required: ['status'],
};

const VENUES_JSON = {
  type: 'object',
  properties: {
    ...statusFields,
    venues: {
      type: 'array',
      minItems: 3,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          type: str('Kind of venue.'),
          name: str('A generic descriptive name, never a real business.'),
          seating: str('Suggested seating arrangement.'),
          capacityFit: str('How well it fits the group size.'),
          mapsQuery: str('A plain Google Maps search phrase.'),
          notes: str('One or two practical notes.'),
        },
        required: ['type', 'name', 'seating', 'capacityFit', 'mapsQuery', 'notes'],
      },
    },
  },
  required: ['status'],
};

const ENHANCE_JSON = {
  type: 'object',
  properties: {
    ...statusFields,
    enhanced: {
      type: 'object',
      properties: { text: str('The rewritten text, plain, no markdown.'), subject: str('Subject line, only for the invitation email style.') },
      required: ['text'],
    },
  },
  required: ['status'],
};

// kind -> what the service needs. `freeText` names the fields a person typed (checked again by the
// service as defence in depth).
export const KIND_SPECS = {
  draft: { jsonSchema: DRAFT_JSON, parse: envelope('draft', draftPayload), freeText: (p) => [p.prompt] },
  concepts: { jsonSchema: CONCEPTS_JSON, parse: envelope('concepts', conceptsPayload, 'concepts'), freeText: (p) => [p.vibe, p.department, p.budget] },
  venues: { jsonSchema: VENUES_JSON, parse: envelope('venues', venuesPayload, 'venues'), freeText: (p) => [p.theme, p.city] },
  enhance: { jsonSchema: ENHANCE_JSON, parse: envelope('enhanced', enhancePayload), freeText: (p) => [p.text, p.eventTitle] },
};
