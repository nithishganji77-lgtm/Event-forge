import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { MAX_COVER_IMAGE_MB } from '../constants/limits.js';
import { humanizeField } from '../utils/fieldLabels.js';
import { isProduction } from '../config/env.js';
import { logger } from '../config/logger.js';

// What a duplicate-key error means in words, by the index that was violated. Most of these are
// caught earlier by a service that checks first; this is what a person reads if two requests race.
const DUPLICATE_MESSAGES = {
  email: { message: 'An account with this email already exists.', path: 'email' },
  'event,user': { message: 'You are already registered for this event.' },
  'organization,slug': { message: 'That name is already in use here. Try a slightly different one.' },
  'organization,email': { message: 'An invitation for that email address is already pending.', path: 'email' },
  'organization,user': { message: 'That person is already a member of this organization.' },
  googleId: { message: 'That Google account is already linked to another EventForge account.' },
};

// Mongoose's own wording: "Path `title` is required." -> "Event name is required."
function friendlyMongooseMessage(fieldError) {
  const required = /^Path `(.+)` is required\.?$/.exec(fieldError.message);
  if (required) return `${humanizeField(required[1].split('.')) ?? 'This field'} is required`;
  const enumError = /^`(.+)` is not a valid enum value/.exec(fieldError.message);
  if (enumError) return `Choose a valid option for ${(humanizeField([fieldError.path]) ?? 'this field').toLowerCase()}`;
  return fieldError.message;
}

const UPLOAD_MESSAGES = {
  LIMIT_FILE_SIZE: `That image is too large. The limit is ${MAX_COVER_IMAGE_MB} MB.`,
  LIMIT_UNEXPECTED_FILE: 'Upload one image file.',
  LIMIT_FILE_COUNT: 'Upload one image file.',
};

function normalizeError(err) {
  if (err instanceof ApiError) return err;

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: friendlyMongooseMessage(e) }));
    return new ApiError(400, ERROR_CODES.VALIDATION_ERROR, details[0]?.message ?? 'Some of that information is not valid.', details);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return new ApiError(400, ERROR_CODES.VALIDATION_ERROR, "That link isn't valid. Check the address and try again.");
  }

  // Mongo duplicate key
  if (err.code === 11000) {
    const key = Object.keys(err.keyPattern || {}).sort().join(',');
    const known = DUPLICATE_MESSAGES[key];
    return new ApiError(
      409,
      ERROR_CODES.CONFLICT,
      known?.message ?? 'That already exists.',
      known?.path ? [{ path: known.path, message: known.message }] : undefined
    );
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return new ApiError(401, ERROR_CODES.UNAUTHORIZED, 'Your session has expired. Please sign in again.');
  }

  // Multer upload errors (file too large, too many files, etc.) — a client-input problem, not a
  // server fault.
  if (err.name === 'MulterError') {
    return new ApiError(400, ERROR_CODES.VALIDATION_ERROR, UPLOAD_MESSAGES[err.code] ?? 'The upload did not work. Try a different image.');
  }

  // Body-parser failures: a body that is not valid JSON, or is bigger than the limit. Without this
  // they fell through to a 500 "Something went wrong".
  if (err.type === 'entity.parse.failed') {
    return new ApiError(400, ERROR_CODES.VALIDATION_ERROR, "We couldn't read that request. Refresh the page and try again.");
  }
  if (err.type === 'entity.too.large') {
    return new ApiError(413, ERROR_CODES.VALIDATION_ERROR, 'That request is too large to send.');
  }

  return new ApiError(500, ERROR_CODES.INTERNAL_ERROR, 'Something went wrong on our side. Please try again in a moment.');
}

// Must be registered last, after all routes.
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const apiError = normalizeError(err);

  if (apiError.statusCode >= 500) {
    logger.error({ err, path: req.originalUrl }, 'Unhandled error');
  }

  res.status(apiError.statusCode).json({
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
      ...(isProduction ? {} : { stack: err.stack }),
    },
  });
}
