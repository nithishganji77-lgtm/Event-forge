import { Router } from 'express';
import * as meController from '../controllers/me.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { notificationParamsSchema, listMyNotificationsQuerySchema } from '../validators/me.validator.js';

const router = Router();

router.get('/events', authenticate, meController.listMyEventsHandler);

router.get(
  '/notifications',
  authenticate,
  validate({ query: listMyNotificationsQuerySchema }),
  meController.listMyNotificationsHandler
);

router.patch(
  '/notifications/read-all',
  authenticate,
  meController.markAllNotificationsReadHandler
);

router.patch(
  '/notifications/:notificationId/read',
  authenticate,
  validate({ params: notificationParamsSchema }),
  meController.markNotificationReadHandler
);

export default router;
