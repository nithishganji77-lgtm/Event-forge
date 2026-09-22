import { Router } from 'express';
import authRoutes from './auth.routes.js';
import organizationRoutes from './organization.routes.js';
import inviteAcceptRoutes from './inviteAccept.routes.js';
import eventDetailRoutes from './eventDetail.routes.js';
import meRoutes from './me.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' }, message: 'EventForge API' });
});

router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/invites', inviteAcceptRoutes);
router.use('/events', eventDetailRoutes);
router.use('/me', meRoutes);

export default router;
