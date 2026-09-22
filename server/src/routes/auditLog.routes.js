import { Router } from 'express';
import * as auditLogController from '../controllers/auditLog.controller.js';
import { orgContext } from '../middleware/orgContext.js';
import { requirePermission } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  auditLogOrgParamsSchema,
  recentAuditLogsQuerySchema,
  listAuditLogsQuerySchema,
} from '../validators/auditLog.validator.js';

const router = Router({ mergeParams: true });

// Mounted at /recent deliberately — the full paginated/searchable/filterable browser below owns
// the root GET /organizations/:orgId/audit-logs path as a sibling route on this same file, with no
// collision or rename needed. This is a small fixed feed for one dashboard widget only.
router.get(
  '/recent',
  validate({ params: auditLogOrgParamsSchema, query: recentAuditLogsQuerySchema }),
  orgContext,
  requirePermission(PERMISSIONS.AUDIT_READ),
  auditLogController.listRecentAuditLogsHandler
);

router.get(
  '/',
  validate({ params: auditLogOrgParamsSchema, query: listAuditLogsQuerySchema }),
  orgContext,
  requirePermission(PERMISSIONS.AUDIT_READ),
  auditLogController.listAuditLogsHandler
);

export default router;
