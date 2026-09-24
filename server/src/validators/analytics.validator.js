import { z } from 'zod';
import { isValidTimeZone } from '../utils/eventTime.js';

export { orgParamsSchema as analyticsOrgParamsSchema } from './organization.validator.js';
export { eventParamsSchema as analyticsEventParamsSchema } from './event.validator.js';

// The browser's IANA zone, so "this month" means the viewer's own calendar month.
export const dashboardSummaryQuerySchema = z.object({
  tz: z.string().trim().max(60).refine(isValidTimeZone, 'Unknown timezone').optional(),
});
