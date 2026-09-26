import bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'node:crypto';
import { User } from '../models/User.js';
import { OrganizationMember } from '../models/OrganizationMember.js';
import { ApiError } from '../utils/ApiError.js';

const SALT_ROUNDS = 12;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function registerUser({ name, email, password }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists. Try signing in instead.', [
      { path: 'email', message: 'An account with this email already exists. Try signing in instead.' },
    ]);
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ name, email: email.toLowerCase(), password: hashed });
  return user;
}

export async function verifyCredentials(email, password) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user || !user.isActive) {
    throw ApiError.unauthorized("That email and password don't match. Check them and try again, or reset your password.");
  }
  if (!user.password) {
    throw ApiError.unauthorized('This account uses Google sign-in. Choose "Continue with Google" instead.');
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    throw ApiError.unauthorized("That email and password don't match. Check them and try again, or reset your password.");
  }

  return user;
}

export async function getMembershipsForUser(userId) {
  const memberships = await OrganizationMember.find({ user: userId, status: 'ACTIVE' })
    .populate('organization', 'name slug logo')
    .lean();

  return memberships
    .filter((m) => m.organization)
    .map((m) => ({
      organizationId: m.organization._id,
      organizationName: m.organization.name,
      organizationSlug: m.organization.slug,
      role: m.role,
      permissions: m.permissions,
    }));
}

// googleId match wins (repeat Google login); else match by email and link googleId onto that
// existing local account (Google's email_verified claim is why linking-by-email is safe here);
// else create a brand-new, password-less account.
export async function findOrCreateGoogleUser({ googleId, email, name, avatar }) {
  const normalizedEmail = email.toLowerCase();

  let user = await User.findOne({ googleId });
  if (user) return { user, isNewUser: false };

  user = await User.findOne({ email: normalizedEmail });
  if (user) {
    user.googleId = googleId;
    if (!user.avatar && avatar) user.avatar = avatar;
    await user.save();
    return { user, isNewUser: false };
  }

  user = await User.create({ name, email: normalizedEmail, googleId, avatar });
  return { user, isNewUser: true };
}

export async function invalidateAllSessions(userId) {
  await User.findByIdAndUpdate(userId, { $inc: { refreshTokenVersion: 1 } });
}

export async function createPasswordResetToken(email) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Do not reveal whether the account exists.
    return null;
  }

  const rawToken = randomBytes(32).toString('hex');
  const hashedToken = createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();

  return { user, rawToken };
}

export async function resetPasswordWithToken(rawToken, newPassword) {
  const hashedToken = createHash('sha256').update(rawToken).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw ApiError.badRequest('That password reset link is invalid or has expired. Request a new one.');
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  user.refreshTokenVersion += 1;
  await user.save();

  return user;
}

export function toPublicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
  };
}
