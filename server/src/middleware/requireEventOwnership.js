import { ROLES } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';

// Bypasses for SUPER_ADMIN/ORG_ADMIN. For everyone else (role-based, not permission-based — an
// EMPLOYEE custom-granted EVENT_UPDATE via an additive permission override should still be
// ownership-scoped, not treated as admin-equivalent), requires the caller to be the event's
// creator or listed in its organizers[].
export function requireEventOwnership(req, res, next) {
  if (req.membership.role === ROLES.SUPER_ADMIN || req.membership.role === ROLES.ORG_ADMIN) {
    return next();
  }

  const userId = req.user._id.toString();
  const isOwner =
    req.event.createdBy.toString() === userId ||
    req.event.organizers.some((id) => id.toString() === userId);

  if (!isOwner) {
    throw ApiError.forbidden('You can only manage events you created or organize');
  }
  next();
}
