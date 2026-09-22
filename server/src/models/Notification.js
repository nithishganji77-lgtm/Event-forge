import mongoose from 'mongoose';
import { NOTIFICATION_TYPE_VALUES } from '../constants/notificationTypes.js';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Unlike AuditLog.organization, this is always required — every trigger that creates a
    // Notification already has org context (orgContext/eventContext), no pre-org-auth case exists.
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    type: { type: String, enum: NOTIFICATION_TYPE_VALUES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    relatedEntityType: { type: String, trim: true, default: null },
    relatedEntityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Two indexes, not one: a combined {recipient,read,createdAt} index buckets entries by `read`
// first, so it can't serve a clean createdAt-sorted stream across both buckets for the
// "all notifications" list. This one serves that; the second serves unread-only + the count badge.
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
