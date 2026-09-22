import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, 'Organization name is too short').max(160),
  description: z.string().trim().max(2000).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
});
