import { ApiError } from '../utils/ApiError.js';

// The method and URL go in `details` for whoever is debugging a wrong endpoint; the message is for
// a person.
export function notFound(req, res, next) {
  const error = ApiError.notFound("We couldn't find what you were looking for.");
  error.details = { method: req.method, url: req.originalUrl };
  next(error);
}
