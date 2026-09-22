import { z } from 'zod';
import { objectId } from './common.js';
import { paginationQuerySchema } from '../utils/paginate.js';
import { ROLE_VALUES, MEMBER_STATUS_VALUES } from '../constants/roles.js';
import { PERMISSION_VALUES } from '../constants/permissions.js';

export const memberParamsSchema = z.object({
  orgId: objectId,
  memberId: objectId,
});

export const listMembersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  role: z.enum(ROLE_VALUES).optional(),
  status: z.enum(MEMBER_STATUS_VALUES).optional(),
});

export const updateMemberSchema = z
  .object({
    role: z.enum(ROLE_VALUES).optional(),
    permissions: z.array(z.enum(PERMISSION_VALUES)).optional(),
  })
  .refine((data) => data.role !== undefined || data.permissions !== undefined, {
    message: 'Provide at least one of role or permissions',
  });

export const updateMemberStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'DISABLED']),
});
