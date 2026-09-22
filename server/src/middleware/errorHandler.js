import { ApiError } from '../utils/ApiError.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { isProduction } from '../config/env.js';
import { logger } from '../config/logger.js';

function normalizeError(err) {
  if (err instanceof ApiError) return err;

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
    return new ApiError(400, ERROR_CODES.VALIDATION_ERROR, 'Invalid data', details);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return new ApiError(400, ERROR_CODES.VALIDATION_ERROR, `Invalid value for ${err.path}`);
  }

  // Mongo duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {}).join(', ') || 'field';
    return new ApiError(409, ERROR_CODES.CONFLICT, `${field} already exists`);
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return new ApiError(401, ERROR_CODES.UNAUTHORIZED, 'Invalid or expired session');
  }

  // Multer upload errors (file too large, too many files, etc.) — a client-input problem, not a
  // server fault.
  if (err.name === 'MulterError') {
    return new ApiError(400, ERROR_CODES.VALIDATION_ERROR, err.message);
  }

  return new ApiError(500, ERROR_CODES.INTERNAL_ERROR, 'Something went wrong');
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
