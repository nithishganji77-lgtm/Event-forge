import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../config/logger.js';

// Centralized audit-log writer so mutation endpoints don't duplicate this logic.
// Never throws — an audit-log write failure must not fail the underlying request.
export async function writeAuditLog({
  organization = null,
  actor,
  action,
  entityType,
  entityId = null,
  metadata = {},
  req = null,
}) {
  try {
    await AuditLog.create({
      organization,
      actor,
      action,
      entityType,
      entityId,
      metadata,
      ipAddress: req?.ip || '',
      userAgent: req?.headers?.['user-agent'] || '',
    });
  } catch (err) {
    logger.error({ err, action, entityType }, 'Failed to write audit log');
  }
}

// Denormalised onto event- and registration-related audit rows at write time. Registration rows
// point at a registration id (not the event), and the feed needs a readable "registered for
// <title>" without a read-time join — writing the title here also survives the event being
// renamed or deleted later.
export function eventAuditMetadata(event, extra = {}) {
  return { eventId: event._id, eventTitle: event.title, ...extra };
}
