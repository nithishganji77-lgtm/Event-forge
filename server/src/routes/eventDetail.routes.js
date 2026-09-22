import { Router } from 'express';
import * as eventController from '../controllers/event.controller.js';
import * as registrationController from '../controllers/registration.controller.js';
import * as analyticsController from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { eventContext } from '../middleware/eventContext.js';
import { requirePermission } from '../middleware/authorize.js';
import { requireEventOwnership } from '../middleware/requireEventOwnership.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  eventParamsSchema,
  updateEventSchema,
  duplicateEventSchema,
} from '../validators/event.validator.js';
import {
  listRegistrationsQuerySchema,
  markAttendanceParamsSchema,
  markAttendanceSchema,
} from '../validators/registration.validator.js';

const router = Router();

// Org is unknown from these URLs — resolved from the event itself via eventContext.
router.use(authenticate);

router.get(
  '/:eventId',
  validate({ params: eventParamsSchema }),
  eventContext,
  requirePermission(PERMISSIONS.EVENT_READ),
  eventController.getEventHandler
);

router.patch(
  '/:eventId',
  validate({ params: eventParamsSchema, body: updateEventSchema }),
  eventContext,
  requirePermission(PERMISSIONS.EVENT_UPDATE),
  requireEventOwnership,
  eventController.updateEventHandler
);

router.delete(
  '/:eventId',
  validate({ params: eventParamsSchema }),
  eventContext,
  requirePermission(PERMISSIONS.EVENT_DELETE),
  requireEventOwnership,
  eventController.deleteEventHandler
);

router.post(
  '/:eventId/publish',
  validate({ params: eventParamsSchema }),
  eventContext,
  requirePermission(PERMISSIONS.EVENT_PUBLISH),
  requireEventOwnership,
  eventController.publishEventHandler
);

router.post(
  '/:eventId/cancel',
  validate({ params: eventParamsSchema }),
  eventContext,
  requirePermission(PERMISSIONS.EVENT_UPDATE),
  requireEventOwnership,
  eventController.cancelEventHandler
);

router.post(
  '/:eventId/duplicate',
  validate({ params: eventParamsSchema, body: duplicateEventSchema }),
  eventContext,
  requirePermission(PERMISSIONS.EVENT_CREATE),
  requireEventOwnership,
  eventController.duplicateEventHandler
);

router.post(
  '/:eventId/cover-image',
  validate({ params: eventParamsSchema }),
  eventContext,
  requirePermission(PERMISSIONS.EVENT_UPDATE),
  requireEventOwnership,
  upload.single('coverImage'),
  eventController.uploadCoverImageHandler
);

router.post(
  '/:eventId/register',
  validate({ params: eventParamsSchema }),
  eventContext,
  requirePermission(PERMISSIONS.EVENT_READ),
  registrationController.registerHandler
);

router.delete(
  '/:eventId/register',
  validate({ params: eventParamsSchema }),
  eventContext,
  requirePermission(PERMISSIONS.EVENT_READ),
  registrationController.cancelRegistrationHandler
);

router.get(
  '/:eventId/registrations',
  validate({ params: eventParamsSchema, query: listRegistrationsQuerySchema }),
  eventContext,
  requirePermission(PERMISSIONS.REGISTRATION_MANAGE),
  requireEventOwnership,
  registrationController.listRegistrationsHandler
);

router.patch(
  '/:eventId/registrations/:registrationId/attendance',
  validate({ params: markAttendanceParamsSchema, body: markAttendanceSchema }),
  eventContext,
  requirePermission(PERMISSIONS.REGISTRATION_MANAGE),
  requireEventOwnership,
  registrationController.markAttendanceHandler
);

router.get(
  '/:eventId/analytics',
  validate({ params: eventParamsSchema }),
  eventContext,
  requirePermission(PERMISSIONS.ANALYTICS_READ),
  requireEventOwnership,
  analyticsController.getEventAnalyticsHandler
);

export default router;
