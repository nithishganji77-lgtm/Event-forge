import { Invite } from '../models/Invite.js';
import {
  createOrResendInvite,
  resendInvite as resendInviteService,
  revokeInvite as revokeInviteService,
  listInvites,
  previewInviteByToken,
  acceptInviteByToken,
} from '../services/invite.service.js';
import { writeAuditLog } from '../services/audit.service.js';
import { AUDIT_ACTIONS } from '../constants/auditActions.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendPaginated, sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

async function loadInvite(req) {
  const invite = await Invite.findOne({ _id: req.params.inviteId, organization: req.organization._id });
  if (!invite) throw ApiError.notFound("We couldn't find that invitation. The link may be wrong.");
  return invite;
}

export const createInviteHandler = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  const invite = await createOrResendInvite({
    organization: req.organization,
    email,
    role,
    invitedBy: req.user,
  });

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.INVITE_SENT,
    entityType: 'Invite',
    entityId: invite._id,
    metadata: { email, role },
    req,
  });

  return sendSuccess(res, { statusCode: 201, message: 'Invite sent successfully', data: { invite } });
});

export const listInvitesHandler = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const { data, total } = await listInvites(req.organization._id, { page, limit, status });
  return sendPaginated(res, { data, page, limit, total });
});

export const resendInviteHandler = asyncHandler(async (req, res) => {
  const invite = await loadInvite(req);
  const updated = await resendInviteService(invite, req.user, req.organization.name);

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.INVITE_RESENT,
    entityType: 'Invite',
    entityId: invite._id,
    metadata: { email: invite.email },
    req,
  });

  return sendSuccess(res, { message: 'Invite resent successfully', data: { invite: updated } });
});

export const revokeInviteHandler = asyncHandler(async (req, res) => {
  const invite = await loadInvite(req);
  await revokeInviteService(invite, req.user);

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.INVITE_REVOKED,
    entityType: 'Invite',
    entityId: invite._id,
    metadata: { email: invite.email },
    req,
  });

  return sendSuccess(res, { message: 'Invite revoked successfully' });
});

export const previewInviteHandler = asyncHandler(async (req, res) => {
  const preview = await previewInviteByToken(req.params.token);
  return sendSuccess(res, { data: preview });
});

export const acceptInviteHandler = asyncHandler(async (req, res) => {
  const { membership, organization } = await acceptInviteByToken(req.params.token, req.user);

  await writeAuditLog({
    organization: organization?._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.INVITE_ACCEPTED,
    entityType: 'OrganizationMember',
    entityId: membership._id,
    req,
  });

  return sendSuccess(res, {
    message: `You've joined ${organization?.name}`,
    data: { organizationSlug: organization?.slug },
  });
});
