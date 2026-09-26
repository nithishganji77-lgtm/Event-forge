export class ApiError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Please sign in to continue.') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = "You don't have permission to do that. If you need access, ask an organization admin.") {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = "We couldn't find what you were looking for.") {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message, details) {
    return new ApiError(409, 'CONFLICT', message, details);
  }
}
