import { Router } from 'express';
import * as memberController from '../controllers/member.controller.js';
import { orgContext } from '../middleware/orgContext.js';
import { requirePermission } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  memberParamsSchema,
  listMembersQuerySchema,
  updateMemberSchema,
  updateMemberStatusSchema,
} from '../validators/member.validator.js';
import { orgParamsSchema } from '../validators/organization.validator.js';

const router = Router({ mergeParams: true });

router.get(
  '/',
  validate({ params: orgParamsSchema, query: listMembersQuerySchema }),
  orgContext,
  requirePermission(PERMISSIONS.MEMBER_READ),
  memberController.listMembersHandler
);

router.patch(
  '/:memberId',
  validate({ params: memberParamsSchema, body: updateMemberSchema }),
  orgContext,
  requirePermission(PERMISSIONS.MEMBER_UPDATE),
  memberController.updateMemberHandler
);

router.patch(
  '/:memberId/status',
  validate({ params: memberParamsSchema, body: updateMemberStatusSchema }),
  orgContext,
  requirePermission(PERMISSIONS.MEMBER_UPDATE),
  memberController.updateMemberStatusHandler
);

router.delete(
  '/:memberId',
  validate({ params: memberParamsSchema }),
  orgContext,
  requirePermission(PERMISSIONS.MEMBER_DELETE),
  memberController.removeMemberHandler
);

export default router;
