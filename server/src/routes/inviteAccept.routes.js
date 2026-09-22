import { Router } from 'express';
import * as inviteController from '../controllers/invite.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { validate } from '../middleware/validate.js';
import { tokenParamsSchema } from '../validators/invite.validator.js';

const router = Router();

// Org is unknown from the URL here (it's derived from the token itself), so these can't sit
// behind orgContext. Preview is public; accept requires a logged-in user.
router.get(
  '/:token',
  authLimiter,
  validate({ params: tokenParamsSchema }),
  inviteController.previewInviteHandler
);

router.post(
  '/:token/accept',
  authLimiter,
  authenticate,
  validate({ params: tokenParamsSchema }),
  inviteController.acceptInviteHandler
);

export default router;
