import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { config, smtpConfigured, resendConfigured } from '../config/env.js';
import { logger } from '../config/logger.js';

const resend = resendConfigured ? new Resend(config.RESEND_API_KEY) : null;

let transporter = null;
if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  });
}

// Adapter priority: Resend (if configured) -> SMTP (if configured) -> dev console log. Every call
// site uses the same sendEmail({to,subject,text,html}) signature regardless of which is active.
export async function sendEmail({ to, subject, text, html }) {
  if (resend) {
    // The Resend SDK resolves with { data, error } instead of throwing on API-level failures
    // (e.g. sandbox mode rejecting delivery to a non-account-owner address) — awaiting alone
    // would silently report success on a rejected send.
    const { error } = await resend.emails.send({ from: config.RESEND_FROM_EMAIL, to, subject, text, html });
    if (error) {
      logger.error({ to, subject, error }, 'Resend rejected the email');
      throw new Error(`Resend delivery failed: ${error.message || error.name}`);
    }
    return { delivered: true, mode: 'resend' };
  }

  if (transporter) {
    const info = await transporter.sendMail({ from: config.SMTP_FROM, to, subject, text, html });
    logger.info({ to, subject, accepted: info.accepted, rejected: info.rejected, response: info.response }, '[email:smtp] send result');
    return { delivered: true, mode: 'smtp' };
  }

  logger.info({ to, subject, text }, '[email:dev-console] Email not sent (no provider configured)');
  return { delivered: false, mode: 'console' };
}
