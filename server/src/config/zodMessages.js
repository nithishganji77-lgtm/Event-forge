import { z } from 'zod';
import { humanizeField } from '../utils/fieldLabels.js';

// zod's default messages ("Required", "String must contain at least 2 character(s)", "Invalid
// enum value. Expected 'ORGANIZER' | 'EMPLOYEE'...") are written for developers. This global error
// map replaces the defaults with plain sentences that name the field. A message written on a
// schema itself ("Title is too short") always wins over this map, so it only fills the gaps.
export function friendlyErrorMap(issue, ctx) {
  const label = humanizeField(issue.path);
  const subject = label ?? 'This field';

  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') return { message: `${subject} is required` };
      if (issue.expected === 'number' || issue.expected === 'integer' || issue.received === 'nan') {
        return { message: `${subject} must be a number` };
      }
      if (issue.expected === 'boolean') return { message: `${subject} must be yes or no` };
      return { message: `${subject} is not in the right format` };

    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return { message: issue.minimum <= 1 ? `${subject} is required` : `${subject} must be at least ${issue.minimum} characters` };
      }
      if (issue.type === 'number') return { message: `${subject} must be at least ${issue.minimum}` };
      if (issue.type === 'array') return { message: `${subject} needs at least ${issue.minimum} ${issue.minimum === 1 ? 'entry' : 'entries'}` };
      return { message: ctx.defaultError };

    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `${subject} must be at most ${issue.maximum} characters` };
      if (issue.type === 'number') return { message: `${subject} must be at most ${issue.maximum}` };
      if (issue.type === 'array') return { message: `${subject} can have at most ${issue.maximum} entries` };
      return { message: ctx.defaultError };

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'Enter a valid email address' };
      if (issue.validation === 'url') return { message: `${subject} must be a link starting with http:// or https://` };
      return { message: `${subject} is not in the right format` };

    case z.ZodIssueCode.invalid_enum_value:
      return { message: `Choose a valid option for ${subject.toLowerCase()}` };

    case z.ZodIssueCode.invalid_date:
      return { message: `${subject} must be a valid date` };

    default:
      return { message: ctx.defaultError };
  }
}

z.setErrorMap(friendlyErrorMap);
