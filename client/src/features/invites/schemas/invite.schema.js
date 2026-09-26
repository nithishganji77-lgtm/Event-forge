import { z } from 'zod';

export const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: z.enum(['SUPER_ADMIN', 'ORG_ADMIN', 'ORGANIZER', 'EMPLOYEE']),
});
