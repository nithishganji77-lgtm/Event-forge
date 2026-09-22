import { ApiError } from '../utils/ApiError.js';

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.effectivePermissions?.has(permission)) {
      return next(ApiError.forbidden());
    }
    next();
  };
}
