import { Router } from 'express';
import * as inviteController from '../controllers/invite.controller.js';
import { orgContext } from '../middleware/orgContext.js';
import { requirePermission } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  inviteOrgParamsSchema,
  inviteParamsSchema,
  createInviteSchema,
  listInvitesQuerySchema,
} from '../validators/invite.validator.js';

const router = Router({ mergeParams: true });

router.post(
  '/',
  validate({ params: inviteOrgParamsSchema, body: createInviteSchema }),
  orgContext,
  requirePermission(PERMISSIONS.MEMBER_CREATE),
  inviteController.createInviteHandler
);

router.get(
  '/',
  validate({ params: inviteOrgParamsSchema, query: listInvitesQuerySchema }),
  orgContext,
  requirePermission(PERMISSIONS.MEMBER_READ),
  inviteController.listInvitesHandler
);

router.post(
  '/:inviteId/resend',
  validate({ params: inviteParamsSchema }),
  orgContext,
  requirePermission(PERMISSIONS.MEMBER_CREATE),
  inviteController.resendInviteHandler
);

router.delete(
  '/:inviteId',
  validate({ params: inviteParamsSchema }),
  orgContext,
  requirePermission(PERMISSIONS.MEMBER_DELETE),
  inviteController.revokeInviteHandler
);

export default router;
