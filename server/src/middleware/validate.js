import { ApiError } from '../utils/ApiError.js';

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
        return next(ApiError.badRequest('Invalid request data', details));
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
