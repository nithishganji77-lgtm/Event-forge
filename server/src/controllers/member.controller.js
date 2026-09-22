import { OrganizationMember } from '../models/OrganizationMember.js';
import {
  listMembers,
  updateMember as updateMemberService,
  updateMemberStatus as updateMemberStatusService,
  removeMember as removeMemberService,
} from '../services/member.service.js';
import { writeAuditLog } from '../services/audit.service.js';
import { AUDIT_ACTIONS } from '../constants/auditActions.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendPaginated, sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';

async function loadMember(req) {
  const member = await OrganizationMember.findOne({
    _id: req.params.memberId,
    organization: req.organization._id,
  });
  if (!member) throw ApiError.notFound('Member not found');
  return member;
}

export const listMembersHandler = asyncHandler(async (req, res) => {
  const { page, limit, search, role, status } = req.query;
  const { data, total } = await listMembers(req.organization._id, { page, limit, search, role, status });
  return sendPaginated(res, { data, page, limit, total });
});

export const updateMemberHandler = asyncHandler(async (req, res) => {
  const member = await loadMember(req);
  const previousRole = member.role;
  const { role, permissions } = req.body;

  const { member: updated, changes } = await updateMemberService(member, { role, permissions });

  if (changes.role) {
    await writeAuditLog({
      organization: req.organization._id,
      actor: req.user._id,
      action: AUDIT_ACTIONS.MEMBER_ROLE_CHANGED,
      entityType: 'OrganizationMember',
      entityId: member._id,
      metadata: { targetUser: member.user, fromRole: previousRole, toRole: role },
      req,
    });
  }
  if (changes.permissions) {
    await writeAuditLog({
      organization: req.organization._id,
      actor: req.user._id,
      action: AUDIT_ACTIONS.MEMBER_PERMISSIONS_UPDATED,
      entityType: 'OrganizationMember',
      entityId: member._id,
      metadata: { targetUser: member.user, permissions },
      req,
    });
  }

  return sendSuccess(res, { message: 'Member updated successfully', data: { member: updated } });
});

export const updateMemberStatusHandler = asyncHandler(async (req, res) => {
  const member = await loadMember(req);
  const { status } = req.body;

  const updated = await updateMemberStatusService(member, status);

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: status === 'DISABLED' ? AUDIT_ACTIONS.MEMBER_DISABLED : AUDIT_ACTIONS.MEMBER_ENABLED,
    entityType: 'OrganizationMember',
    entityId: member._id,
    metadata: { targetUser: member.user },
    req,
  });

  return sendSuccess(res, { message: 'Member status updated successfully', data: { member: updated } });
});

export const removeMemberHandler = asyncHandler(async (req, res) => {
  const member = await loadMember(req);
  const { user: targetUser, role } = member;

  await removeMemberService(member);

  await writeAuditLog({
    organization: req.organization._id,
    actor: req.user._id,
    action: AUDIT_ACTIONS.MEMBER_REMOVED,
    entityType: 'OrganizationMember',
    entityId: member._id,
    metadata: { targetUser, role },
    req,
  });

  return sendSuccess(res, { message: 'Member removed successfully' });
});
