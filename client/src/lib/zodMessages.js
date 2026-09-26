import { z } from 'zod';

// zod's default messages ("Required", "String must contain at least 2 character(s)", "Expected
// number, received nan") are written for developers, and a form field that has no message of its
// own would show them. This map gives every default a plain sentence. A message written on a schema
// always wins, so it only fills gaps. Fields sit beside their label, so the messages need no name.
export function friendlyErrorMap(issue, ctx) {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') return { message: 'This field is required' };
      if (issue.expected === 'number' || issue.expected === 'integer' || issue.received === 'nan') {
        return { message: 'Enter a number' };
      }
      return { message: 'This is not in the right format' };
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') return { message: issue.minimum <= 1 ? 'This field is required' : `Use at least ${issue.minimum} characters` };
      if (issue.type === 'number') return { message: `Must be at least ${issue.minimum}` };
      return { message: ctx.defaultError };
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') return { message: `Use at most ${issue.maximum} characters` };
      if (issue.type === 'number') return { message: `Must be at most ${issue.maximum}` };
      return { message: ctx.defaultError };
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'Enter a valid email address' };
      if (issue.validation === 'url') return { message: 'Enter a link starting with http:// or https://' };
      return { message: 'This is not in the right format' };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: 'Choose one of the options' };
    case z.ZodIssueCode.invalid_date:
      return { message: 'Enter a valid date' };
    default:
      return { message: ctx.defaultError };
  }
}

z.setErrorMap(friendlyErrorMap);
