import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { orgContext } from '../middleware/orgContext.js';
import { requirePermission } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/aiLimiter.js';
import { PERMISSIONS } from '../constants/permissions.js';
import {
  aiOrgParamsSchema,
  draftBodySchema,
  conceptsBodySchema,
  venuesBodySchema,
  enhanceBodySchema,
} from '../validators/ai.validator.js';

const router = Router({ mergeParams: true });

// ForgeAI is for people who can create events: an employee has nothing to do with a draft, and the
// free tier's quota is shared by everyone, so it isn't spent on people who can't act on the answer.
const gate = [orgContext, requirePermission(PERMISSIONS.EVENT_CREATE)];

router.get('/status', validate({ params: aiOrgParamsSchema }), ...gate, aiController.aiStatusHandler);

router.post('/draft', validate({ params: aiOrgParamsSchema, body: draftBodySchema }), ...gate, aiLimiter, aiController.generateDraftHandler);
router.post('/concepts', validate({ params: aiOrgParamsSchema, body: conceptsBodySchema }), ...gate, aiLimiter, aiController.suggestConceptsHandler);
router.post('/venues', validate({ params: aiOrgParamsSchema, body: venuesBodySchema }), ...gate, aiLimiter, aiController.suggestVenuesHandler);
router.post('/enhance', validate({ params: aiOrgParamsSchema, body: enhanceBodySchema }), ...gate, aiLimiter, aiController.enhanceTextHandler);

export default router;
