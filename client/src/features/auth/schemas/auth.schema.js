import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Za-z]/, 'Add at least one letter to your password')
  .regex(/[0-9]/, 'Add at least one number to your password');

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name (at least 2 characters)'),
  email: z.string().trim().email('Enter a valid email address'),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
});
