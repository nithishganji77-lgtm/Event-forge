import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    // Optional: auth actions (register/login/logout) happen before any org context exists.
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ organization: 1, createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
