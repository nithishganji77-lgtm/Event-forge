import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name (at least 2 characters)').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'That reset link is incomplete. Request a new one.'),
  password: passwordSchema,
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Missing Google credential'),
});
