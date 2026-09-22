import mongoose from 'mongoose';
import { ROLE_VALUES, MEMBER_STATUS, MEMBER_STATUS_VALUES } from '../constants/roles.js';
import { PERMISSION_VALUES } from '../constants/permissions.js';

const organizationMemberSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ROLE_VALUES, required: true },
    // Additive overrides only — effective permissions = DEFAULT_ROLE_PERMISSIONS[role] ∪ permissions.
    permissions: [{ type: String, enum: PERMISSION_VALUES }],
    status: { type: String, enum: MEMBER_STATUS_VALUES, default: MEMBER_STATUS.ACTIVE },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

organizationMemberSchema.index({ organization: 1, user: 1 }, { unique: true });
organizationMemberSchema.index({ organization: 1, role: 1 });

export const OrganizationMember = mongoose.model('OrganizationMember', organizationMemberSchema);
