import {
  createOrganization,
  listOrganizationsForUser,
  updateOrganization as updateOrganizationService,
  deleteOrganization as deleteOrganizationService,
} from '../services/organization.service.js';
import { writeAuditLog } from '../services/audit.service.js';
import { AUDIT_ACTIONS } from '../constants/auditActions.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';

export const createOrganizationHandler = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const organization = await createOrganization({ name, description, createdBy: req.user._id });

  await writeAuditLog({
    organization: organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.ORGANIZATION_CREATED,
    entityType: 'Organization',
    entityId: organization._id,
    req,
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Organization created successfully',
    data: { organization },
  });
});

export const listOrganizationsHandler = asyncHandler(async (req, res) => {
  const organizations = await listOrganizationsForUser(req.user._id);
  return sendSuccess(res, { data: { organizations } });
});

export const getOrganizationHandler = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    data: { organization: req.organization, role: req.membership.role },
  });
});

export const updateOrganizationHandler = asyncHandler(async (req, res) => {
  const organization = await updateOrganizationService(req.organization, req.body);

  await writeAuditLog({
    organization: organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.ORGANIZATION_UPDATED,
    entityType: 'Organization',
    entityId: organization._id,
    metadata: { fields: Object.keys(req.body) },
    req,
  });

  return sendSuccess(res, { message: 'Organization updated successfully', data: { organization } });
});

export const deleteOrganizationHandler = asyncHandler(async (req, res) => {
  const organizationId = req.organization._id;

  await writeAuditLog({
    organization: organizationId,
    actor: req.user._id,
    action: AUDIT_ACTIONS.ORGANIZATION_DELETED,
    entityType: 'Organization',
    entityId: organizationId,
    req,
  });

  await deleteOrganizationService(req.organization);

  return sendSuccess(res, { message: 'Organization deleted successfully' });
});
