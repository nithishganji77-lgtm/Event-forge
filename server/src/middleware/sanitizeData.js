// express-mongo-sanitize is unmaintained and throws on Express 5 (req.query is a getter there).
// This recursively strips Mongo-operator-shaped keys ($gt, $where, dotted paths, etc.) from
// req.body and req.params, which remain mutable in Express 5. req.query is never sanitized here —
// instead every route uses a strict zod schema for its query params (see middleware/validate.js),
// which rejects unknown/operator-shaped keys outright and closes the same injection vector.
function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      clean[key] = sanitizeValue(val);
    }
    return clean;
  }

  return value;
}

export function sanitizeData(req, res, next) {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
}
