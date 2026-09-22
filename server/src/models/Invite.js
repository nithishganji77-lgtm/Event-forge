import mongoose from 'mongoose';
import { ROLE_VALUES } from '../constants/roles.js';
import { PERMISSION_VALUES } from '../constants/permissions.js';
import { INVITE_STATUS, INVITE_STATUS_VALUES } from '../constants/inviteStatus.js';

const inviteSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ROLE_VALUES, required: true },
    // Additive overrides, mirrors OrganizationMember.permissions. Not settable via the create-invite
    // validator this phase — extra grants are applied afterward via member update.
    permissions: [{ type: String, enum: PERMISSION_VALUES }],
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, select: false },
    status: { type: String, enum: INVITE_STATUS_VALUES, default: INVITE_STATUS.PENDING },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    revokedAt: { type: Date, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Only one PENDING invite per (org, email) — re-inviting upserts this row instead of colliding
// with old ACCEPTED/REVOKED ones, which the partial filter excludes from the unique constraint.
inviteSchema.index(
  { organization: 1, email: 1 },
  { unique: true, partialFilterExpression: { status: 'PENDING' } }
);
inviteSchema.index({ tokenHash: 1 }, { unique: true });
inviteSchema.index({ email: 1, status: 1 });

export const Invite = mongoose.model('Invite', inviteSchema);
