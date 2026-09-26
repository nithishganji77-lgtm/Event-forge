import { randomBytes, createHash } from 'node:crypto';
import { Invite } from '../models/Invite.js';
import { OrganizationMember } from '../models/OrganizationMember.js';
import { Organization } from '../models/Organization.js';
import { MEMBER_STATUS } from '../constants/roles.js';
import { INVITE_STATUS } from '../constants/inviteStatus.js';
import { AUDIT_ACTIONS } from '../constants/auditActions.js';
import { ApiError } from '../utils/ApiError.js';
import { toSkipLimit } from '../utils/paginate.js';
import { sendEmail } from './email.service.js';
import { writeAuditLog } from './audit.service.js';
import { config } from '../config/env.js';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(rawToken) {
  return createHash('sha256').update(rawToken).digest('hex');
}

async function sendInviteEmail({ email, organizationName, inviterName, rawToken }) {
  const acceptUrl = `${config.CLIENT_URL}/invites/accept?token=${rawToken}`;
  await sendEmail({
    to: email,
    subject: `${inviterName} invited you to join ${organizationName} on EventForge`,
    text: `You've been invited to join ${organizationName} on EventForge. Accept your invite: ${acceptUrl} (expires in 7 days)`,
  });
}

export async function createOrResendInvite({ organization, email, role, invitedBy }) {
  // Membership search must go through User first (email lives there, not on OrganizationMember).
  const existingMembership = await OrganizationMember.aggregate([
    { $match: { organization: organization._id } },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    { $match: { 'user.email': email } },
  ]);

  if (existingMembership.length > 0) {
    const status = existingMembership[0].status;
    if (status === MEMBER_STATUS.ACTIVE) {
      throw ApiError.conflict('This person is already a member of this organization.', [
        { path: 'email', message: 'This person is already a member of this organization.' },
      ]);
    }
    throw ApiError.conflict('This person is already in the organization but their access is turned off. Turn it back on from the Members page instead of inviting them again.', [
      { path: 'email', message: 'This person is already in the organization but their access is turned off. Turn it back on from the Members page instead.' },
    ]);
  }

  const rawToken = randomBytes(32).toString('hex');
  const invite = await Invite.findOneAndUpdate(
    { organization: organization._id, email, status: INVITE_STATUS.PENDING },
    {
      organization: organization._id,
      email,
      role,
      invitedBy: invitedBy._id,
      tokenHash: hashToken(rawToken),
      status: INVITE_STATUS.PENDING,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await sendInviteEmail({
    email,
    organizationName: organization.name,
    inviterName: invitedBy.name,
    rawToken,
  });

  return invite;
}

export async function resendInvite(invite, invitedBy, organizationName) {
  const rawToken = randomBytes(32).toString('hex');
  invite.tokenHash = hashToken(rawToken);
  invite.expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  await invite.save();

  await sendInviteEmail({
    email: invite.email,
    organizationName,
    inviterName: invitedBy.name,
    rawToken,
  });

  return invite;
}

export async function revokeInvite(invite, revokedBy) {
  invite.status = INVITE_STATUS.REVOKED;
  invite.revokedAt = new Date();
  invite.revokedBy = revokedBy._id;
  await invite.save();
  return invite;
}

export async function listInvites(organizationId, { page, limit, status }) {
  const filter = { organization: organizationId };
  if (status) filter.status = status;

  const { skip, limit: take } = toSkipLimit({ page, limit });
  const [data, total] = await Promise.all([
    Invite.find(filter)
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(take)
      .lean(),
    Invite.countDocuments(filter),
  ]);

  const now = Date.now();
  return {
    data: data.map((invite) => ({
      ...invite,
      isExpired: invite.status === INVITE_STATUS.PENDING && invite.expiresAt.getTime() < now,
    })),
    total,
  };
}

export async function previewInviteByToken(rawToken) {
  const invite = await Invite.findOne({ tokenHash: hashToken(rawToken) })
    .populate('organization', 'name slug');
  if (!invite) {
    throw ApiError.notFound('Invite not found');
  }

  return {
    email: invite.email,
    role: invite.role,
    status: invite.status,
    isExpired: invite.status === INVITE_STATUS.PENDING && invite.expiresAt.getTime() < Date.now(),
    organizationName: invite.organization?.name,
    organizationSlug: invite.organization?.slug,
    expiresAt: invite.expiresAt,
  };
}

export async function acceptInviteByToken(rawToken, user) {
  const invite = await Invite.findOne({ tokenHash: hashToken(rawToken) });
  if (!invite) {
    throw ApiError.notFound('Invite not found');
  }
  if (invite.email !== user.email.toLowerCase()) {
    throw ApiError.forbidden('This invite was sent to a different email address. Sign in with the address it was sent to.');
  }
  if (invite.status !== INVITE_STATUS.PENDING) {
    throw ApiError.conflict('This invite has already been used or was cancelled. Ask for a new one.');
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    throw ApiError.conflict('This invite has expired. Ask an admin to send a new one.');
  }

  const membership = await createMembershipFromInvite(invite, user);

  invite.status = INVITE_STATUS.ACCEPTED;
  invite.acceptedAt = new Date();
  invite.acceptedBy = user._id;
  await invite.save();

  const organization = await Organization.findById(invite.organization);
  return { membership, organization };
}

async function createMembershipFromInvite(invite, user) {
  const existing = await OrganizationMember.findOne({ organization: invite.organization, user: user._id });
  if (existing) return existing;

  return OrganizationMember.create({
    organization: invite.organization,
    user: user._id,
    role: invite.role,
    permissions: invite.permissions,
    status: MEMBER_STATUS.ACTIVE,
  });
}

// Called right after a new User is created (normal registration or Google sign-in) so anyone who
// followed an invite link into registration auto-joins as part of that one consenting action.
export async function acceptAllPendingInvitesForEmail(user) {
  const invites = await Invite.find({
    email: user.email.toLowerCase(),
    status: INVITE_STATUS.PENDING,
    expiresAt: { $gt: new Date() },
  });

  const accepted = [];
  for (const invite of invites) {
    // eslint-disable-next-line no-await-in-loop
    const membership = await createMembershipFromInvite(invite, user);
    invite.status = INVITE_STATUS.ACCEPTED;
    invite.acceptedAt = new Date();
    invite.acceptedBy = user._id;
    // eslint-disable-next-line no-await-in-loop
    await invite.save();
    // eslint-disable-next-line no-await-in-loop
    await writeAuditLog({
      organization: invite.organization,
      actor: user._id,
      action: AUDIT_ACTIONS.INVITE_ACCEPTED,
      entityType: 'OrganizationMember',
      entityId: membership._id,
      metadata: { viaRegistration: true },
    });
    accepted.push({ invite, membership });
  }
  return accepted;
}
