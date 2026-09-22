import { z } from 'zod';
import { objectId } from './common.js';
import { paginationQuerySchema } from '../utils/paginate.js';

export const notificationParamsSchema = z.object({ notificationId: objectId });

export const listMyNotificationsQuerySchema = paginationQuerySchema.extend({
  // Not z.coerce.boolean(): that coerces via JS's Boolean(value), so the query string "false"
  // (any non-empty string) would coerce to true — silently turning "ALL" into "unread only".
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((v) => v === 'true'),
});
