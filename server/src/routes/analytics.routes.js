import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller.js';
import { orgContext } from '../middleware/orgContext.js';
import { requirePermission } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { analyticsOrgParamsSchema, dashboardSummaryQuerySchema } from '../validators/analytics.validator.js';

const router = Router({ mergeParams: true });

router.get(
  '/',
  validate({ params: analyticsOrgParamsSchema }),
  orgContext,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getOrgAnalyticsHandler
);

router.get(
  '/dashboard',
  validate({ params: analyticsOrgParamsSchema, query: dashboardSummaryQuerySchema }),
  orgContext,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  analyticsController.getDashboardSummaryHandler
);

export default router;
