import { z } from 'zod';

export const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  role: z.enum(['SUPER_ADMIN', 'ORG_ADMIN', 'ORGANIZER', 'EMPLOYEE']),
});
