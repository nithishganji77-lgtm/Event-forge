import { Event } from '../models/Event.js';
import { Organization } from '../models/Organization.js';
import { OrganizationMember } from '../models/OrganizationMember.js';
import { MEMBER_STATUS } from '../constants/roles.js';
import { getEffectivePermissions } from '../constants/permissions.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Same shape as orgContext, for the flat /events/:eventId routes (org isn't in those URLs — it's
// resolved from the event itself). Runs after authenticate + params validation.
export const eventContext = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) {
    throw ApiError.notFound("We couldn't find that event. It may have been deleted, or the link may be wrong.");
  }

  const organization = await Organization.findById(event.organization);
  if (!organization) {
    throw ApiError.notFound("We couldn't find that organization.");
  }

  const membership = await OrganizationMember.findOne({
    organization: event.organization,
    user: req.user._id,
  });
  if (!membership) {
    throw ApiError.forbidden('You are not a member of this organization');
  }
  if (membership.status === MEMBER_STATUS.DISABLED) {
    throw ApiError.forbidden('Your access to this organization has been turned off. Contact an organization admin.');
  }

  req.event = event;
  req.organization = organization;
  req.membership = membership;
  req.effectivePermissions = getEffectivePermissions(membership.role, membership.permissions);
  next();
});
