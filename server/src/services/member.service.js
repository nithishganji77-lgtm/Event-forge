import { OrganizationMember } from '../models/OrganizationMember.js';
import { User } from '../models/User.js';
import { ROLES, MEMBER_STATUS } from '../constants/roles.js';
import { escapeRegex } from '../utils/paginate.js';
import { ApiError } from '../utils/ApiError.js';

export async function listMembers(organizationId, { page, limit, search, role, status }) {
  const filter = { organization: organizationId };
  if (role) filter.role = role;
  if (status) filter.status = status;

  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    const users = await User.find({ $or: [{ name: pattern }, { email: pattern }] })
      .select('_id')
      .lean();
    filter.user = { $in: users.map((u) => u._id) };
  }

  const [data, total] = await Promise.all([
    OrganizationMember.find(filter)
      .populate('user', 'name email avatar isActive')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    OrganizationMember.countDocuments(filter),
  ]);

  return { data, total };
}

// Before demoting/disabling/removing a member who currently holds SUPER_ADMIN, make sure at
// least one other ACTIVE SUPER_ADMIN would remain. Pre-check, not a transaction — matches the
// no-transactions style used elsewhere (this codebase runs against a standalone Mongo instance).
export async function assertNotLastSuperAdmin(organizationId, memberIdBeingChanged) {
  const remaining = await OrganizationMember.countDocuments({
    organization: organizationId,
    role: ROLES.SUPER_ADMIN,
    status: MEMBER_STATUS.ACTIVE,
    _id: { $ne: memberIdBeingChanged },
  });
  if (remaining === 0) {
    throw ApiError.conflict('An organization must have at least one active SUPER_ADMIN');
  }
}

export async function updateMember(member, { role, permissions }) {
  if (role !== undefined && role !== member.role && member.role === ROLES.SUPER_ADMIN) {
    await assertNotLastSuperAdmin(member.organization, member._id);
  }

  const changes = {};
  if (role !== undefined && role !== member.role) changes.role = { from: member.role, to: role };
  if (permissions !== undefined) changes.permissions = true;

  if (role !== undefined) member.role = role;
  if (permissions !== undefined) member.permissions = permissions;
  await member.save();

  return { member, changes };
}

export async function updateMemberStatus(member, status) {
  if (status === MEMBER_STATUS.DISABLED && member.role === ROLES.SUPER_ADMIN) {
    await assertNotLastSuperAdmin(member.organization, member._id);
  }
  member.status = status;
  await member.save();
  return member;
}

export async function removeMember(member) {
  if (member.role === ROLES.SUPER_ADMIN) {
    await assertNotLastSuperAdmin(member.organization, member._id);
  }
  await member.deleteOne();
}
