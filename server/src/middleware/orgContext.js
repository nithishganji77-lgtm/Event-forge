import { Organization } from '../models/Organization.js';
import { OrganizationMember } from '../models/OrganizationMember.js';
import { MEMBER_STATUS } from '../constants/roles.js';
import { getEffectivePermissions } from '../constants/permissions.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Runs after authenticate + params validation (so :orgId is already a well-formed ObjectId string).
export const orgContext = asyncHandler(async (req, res, next) => {
  const organization = await Organization.findById(req.params.orgId);
  if (!organization) {
    throw ApiError.notFound('Organization not found');
  }

  const membership = await OrganizationMember.findOne({
    organization: organization._id,
    user: req.user._id,
  });
  if (!membership) {
    throw ApiError.forbidden('You are not a member of this organization');
  }
  if (membership.status === MEMBER_STATUS.DISABLED) {
    throw ApiError.forbidden('Your access to this organization has been turned off. Contact an organization admin.');
  }

  req.organization = organization;
  req.membership = membership;
  req.effectivePermissions = getEffectivePermissions(membership.role, membership.permissions);
  next();
});
