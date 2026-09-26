import { z } from 'zod';
import { EVENT_CATEGORIES } from '../constants/eventCategories.js';
import { INPUT_MESSAGES, MAX_ENHANCE_CHARS, MAX_PROMPT_CHARS, cleanInput, findInputProblem } from '../services/ai/guardrails.js';

export { orgParamsSchema as aiOrgParamsSchema } from './organization.validator.js';

// `fresh: true` is "give me another one": it skips the cache read (see the AI service).
const fresh = z.boolean().optional();

// Free text a person typed for the model. The size is checked before cleaning (so a huge body is
// refused early), the text is cleaned, then held to its limit, then screened for injection phrasing
// and personal details, with the message landing on the field it belongs to.
function requestText({ max, multiline = false }) {
  return z
    .string({ required_error: INPUT_MESSAGES.empty, invalid_type_error: INPUT_MESSAGES.empty })
    .max(max * 4, INPUT_MESSAGES.tooLong(max))
    .transform((value) => cleanInput(value, { multiline }))
    .pipe(
      z
        .string()
        .min(1, INPUT_MESSAGES.empty)
        .max(max, INPUT_MESSAGES.tooLong(max))
        .superRefine((value, ctx) => {
          const problem = findInputProblem(value);
          if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
        })
    );
}

// An optional short field: absent or blank is fine, otherwise it is held to the same rules.
function optionalText(max) {
  return z
    .string()
    .max(max * 4, INPUT_MESSAGES.tooLong(max))
    .optional()
    .transform((value) => cleanInput(value ?? ''))
    .superRefine((value, ctx) => {
      if (value.length > max) ctx.addIssue({ code: z.ZodIssueCode.custom, message: INPUT_MESSAGES.tooLong(max) });
      else {
        const problem = findInputProblem(value);
        if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
      }
    })
    .transform((value) => value || undefined);
}

export const draftBodySchema = z.object({
  prompt: requestText({ max: MAX_PROMPT_CHARS }),
  category: z.enum(EVENT_CATEGORIES).optional(),
  fresh,
});

export const conceptsBodySchema = z.object({
  vibe: requestText({ max: 200 }),
  department: optionalText(60),
  budget: optionalText(60),
  fresh,
});

export const venuesBodySchema = z.object({
  theme: requestText({ max: 200 }),
  capacity: z.coerce.number().int().min(1).max(5000),
  city: optionalText(60),
  fresh,
});

export const enhanceBodySchema = z.object({
  text: requestText({ max: MAX_ENHANCE_CHARS, multiline: true }),
  mode: z.enum(['professional', 'energetic', 'invitation_email']),
  eventTitle: optionalText(200),
  fresh,
});
