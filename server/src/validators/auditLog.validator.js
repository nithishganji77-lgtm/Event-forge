import { z } from 'zod';
import { paginationQuerySchema } from '../utils/paginate.js';
import { AUDIT_ACTIONS } from '../constants/auditActions.js';

export { orgParamsSchema as auditLogOrgParamsSchema } from './organization.validator.js';

export const recentAuditLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

// entityType stays a permissive string, not a strict enum: it's free-form string literals
// scattered across every mutation controller across 4 already-verified phases. Retroactively
// enum-locking it would mean auditing every call site for zero write-side benefit just to harden
// a read-only filter — a curated <select> client-side gets the same UX safely.
export const listAuditLogsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  action: z.enum(Object.values(AUDIT_ACTIONS)).optional(),
  entityType: z.string().trim().max(60).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});
