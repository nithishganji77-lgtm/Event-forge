import { getOrgAnalytics, getEventAnalytics, getDashboardSummary } from '../services/analytics.service.js';
import { ROLES } from '../constants/roles.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

function isAdmin(role) {
  return role === ROLES.SUPER_ADMIN || role === ROLES.ORG_ADMIN;
}

export const getOrgAnalyticsHandler = asyncHandler(async (req, res) => {
  const scopeToUserId = isAdmin(req.membership.role) ? null : req.user._id;
  const analytics = await getOrgAnalytics(req.organization._id, scopeToUserId);
  return sendSuccess(res, { data: { analytics } });
});

export const getDashboardSummaryHandler = asyncHandler(async (req, res) => {
  const scopeToUserId = isAdmin(req.membership.role) ? null : req.user._id;
  const summary = await getDashboardSummary(req.organization._id, {
    scopeToUserId,
    canManageInvites: req.effectivePermissions.has(PERMISSIONS.MEMBER_CREATE),
    timeZone: req.query.tz,
  });
  return sendSuccess(res, { data: { summary } });
});

export const getEventAnalyticsHandler = asyncHandler(async (req, res) => {
  const analytics = await getEventAnalytics(req.event);
  return sendSuccess(res, { data: { analytics } });
});
