import { Router } from 'express';
import * as organizationController from '../controllers/organization.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { orgContext } from '../middleware/orgContext.js';
import { requirePermission } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  orgParamsSchema,
  createOrganizationSchema,
  updateOrganizationSchema,
} from '../validators/organization.validator.js';
import memberRoutes from './member.routes.js';
import inviteRoutes from './invite.routes.js';
import eventRoutes from './event.routes.js';
import analyticsRoutes from './analytics.routes.js';
import auditLogRoutes from './auditLog.routes.js';
import aiRoutes from './ai.routes.js';

const router = Router();

// Every organization route requires a logged-in user.
router.use(authenticate);

router.post('/', validate({ body: createOrganizationSchema }), organizationController.createOrganizationHandler);
router.get('/', organizationController.listOrganizationsHandler);

router.get(
  '/:orgId',
  validate({ params: orgParamsSchema }),
  orgContext,
  requirePermission(PERMISSIONS.MEMBER_READ),
  organizationController.getOrganizationHandler
);

router.patch(
  '/:orgId',
  validate({ params: orgParamsSchema, body: updateOrganizationSchema }),
  orgContext,
  requirePermission(PERMISSIONS.ORGANIZATION_UPDATE),
  organizationController.updateOrganizationHandler
);

router.delete(
  '/:orgId',
  validate({ params: orgParamsSchema }),
  orgContext,
  requirePermission(PERMISSIONS.ORGANIZATION_DELETE),
  organizationController.deleteOrganizationHandler
);

router.use('/:orgId/members', memberRoutes);
router.use('/:orgId/invites', inviteRoutes);
router.use('/:orgId/events', eventRoutes);
router.use('/:orgId/analytics', analyticsRoutes);
router.use('/:orgId/audit-logs', auditLogRoutes);
router.use('/:orgId/ai', aiRoutes);

export default router;
