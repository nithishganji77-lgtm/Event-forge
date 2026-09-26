import { z } from 'zod';
import { objectId } from './common.js';

export const orgParamsSchema = z.object({ orgId: objectId });

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, 'Give the organization a name (at least 2 characters)').max(160),
  description: z.string().trim().max(2000).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  logo: z.string().trim().url().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});
