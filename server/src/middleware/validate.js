import { ApiError } from '../utils/ApiError.js';

// One sentence for the top-level message, so a client that only shows `message` still says what to
// fix. `details` keeps every issue with its path, for clients that put each next to its field.
export function summarizeIssues(details) {
  const messages = [...new Set(details.map((detail) => detail.message))];
  if (messages.length <= 3) return messages.join('; ');
  return `${messages.slice(0, 3).join('; ')}; and ${messages.length - 3} more`;
}

// validate({ body, query, params }) — each is an optional zod schema. Query schemas must be
// strict (only known primitive keys) since this is also the de-facto sanitizer for req.query
// (see sanitizeData.js for why req.query itself can't be mutated in Express 5).
export function validate(schemas) {
  return (req, res, next) => {
    for (const key of ['body', 'query', 'params']) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        return next(ApiError.badRequest(summarizeIssues(details), details));
      }

      if (key === 'query') {
        // req.query is a live getter in Express 5 (re-parses req.url on every access, uncached),
        // so mutating the object it returns is silently lost. Shadow the inherited getter with an
        // own data property on this request instance instead.
        Object.defineProperty(req, 'query', {
          value: result.data,
          writable: true,
          enumerable: true,
          configurable: true,
        });
      } else {
        req[key] = result.data;
      }
    }
    next();
  };
}
