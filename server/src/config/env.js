import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  CLIENT_URL: z.string().min(1, 'CLIENT_URL is required'),
  SERVER_BASE_URL: z.string().default('http://localhost:5000'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  REFRESH_TOKEN_TTL_MS: z.coerce.number().default(7 * 24 * 60 * 60 * 1000),

  COOKIE_DOMAIN: z.string().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  STORAGE_LOCAL_DIR: z.string().default('./uploads'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('EventForge <no-reply@eventforge.dev>'),

  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().default('EventForge <onboarding@resend.dev>'),

  GOOGLE_CLIENT_ID: z.string().optional(),

  DEADLINE_REMINDER_CRON: z.string().default('*/15 * * * *'),
  DEADLINE_REMINDER_WINDOW_HOURS: z.coerce.number().default(24),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production') {
  const weakSecrets = ['dev-secret', 'secret', 'changeme', 'test'];
  if (
    weakSecrets.includes(parsed.data.JWT_SECRET) ||
    weakSecrets.includes(parsed.data.JWT_REFRESH_SECRET) ||
    parsed.data.JWT_SECRET === parsed.data.JWT_REFRESH_SECRET
  ) {
    console.error('Refusing to boot in production with weak/default/shared JWT secrets.');
    process.exit(1);
  }
}

export const config = parsed.data;

export const isProduction = config.NODE_ENV === 'production';

export const cloudinaryConfigured = Boolean(
  config.CLOUDINARY_CLOUD_NAME && config.CLOUDINARY_API_KEY && config.CLOUDINARY_API_SECRET
);

export const smtpConfigured = Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);

export const resendConfigured = Boolean(config.RESEND_API_KEY);

export const googleAuthConfigured = Boolean(config.GOOGLE_CLIENT_ID);
