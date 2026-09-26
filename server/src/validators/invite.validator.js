import { z } from 'zod';
import { objectId } from './common.js';
import { paginationQuerySchema } from '../utils/paginate.js';
import { ROLE_VALUES } from '../constants/roles.js';
import { INVITE_STATUS_VALUES } from '../constants/inviteStatus.js';

export const inviteOrgParamsSchema = z.object({ orgId: objectId });

export const inviteParamsSchema = z.object({
  orgId: objectId,
  inviteId: objectId,
});

export const tokenParamsSchema = z.object({ token: z.string().min(1) });

export const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: z.enum(ROLE_VALUES),
});

export const listInvitesQuerySchema = paginationQuerySchema.extend({
  status: z.enum(INVITE_STATUS_VALUES).optional(),
});
