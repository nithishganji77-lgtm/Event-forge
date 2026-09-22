import { Router } from 'express';
import * as eventController from '../controllers/event.controller.js';
import { orgContext } from '../middleware/orgContext.js';
import { requirePermission } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  eventOrgParamsSchema,
  listEventsQuerySchema,
  createEventSchema,
} from '../validators/event.validator.js';

const router = Router({ mergeParams: true });

router.get(
  '/',
  validate({ params: eventOrgParamsSchema, query: listEventsQuerySchema }),
  orgContext,
  requirePermission(PERMISSIONS.EVENT_READ),
  eventController.listEventsHandler
);

router.post(
  '/',
  validate({ params: eventOrgParamsSchema, body: createEventSchema }),
  orgContext,
  requirePermission(PERMISSIONS.EVENT_CREATE),
  eventController.createEventHandler
);

export default router;
