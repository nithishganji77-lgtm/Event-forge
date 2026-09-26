import { User } from '../models/User.js';
import {
  registerUser,
  verifyCredentials,
  getMembershipsForUser,
  invalidateAllSessions,
  createPasswordResetToken,
  resetPasswordWithToken,
  findOrCreateGoogleUser,
  toPublicUser,
} from '../services/auth.service.js';
import { acceptAllPendingInvitesForEmail } from '../services/invite.service.js';
import { verifyGoogleCredential } from '../services/googleAuth.service.js';
import { issueAuthTokens, verifyRefreshToken, signAccessToken, signRefreshToken } from '../services/token.service.js';
import { setAuthCookies, clearAuthCookies } from '../utils/cookies.js';
import { writeAuditLog } from '../services/audit.service.js';
import { sendEmail } from '../services/email.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { config } from '../config/env.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const user = await registerUser({ name, email, password });
  await acceptAllPendingInvitesForEmail(user);

  const { accessToken, refreshToken } = issueAuthTokens(user);
  setAuthCookies(res, { accessToken, refreshToken });

  await writeAuditLog({
    actor: user._id,
    action: 'USER_REGISTERED',
    entityType: 'User',
    entityId: user._id,
    req,
  });

  const memberships = await getMembershipsForUser(user._id);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Account created successfully',
    data: { user: toPublicUser(user), memberships },
  });
});

export const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  const { googleId, email, name, avatar } = await verifyGoogleCredential(credential);

  const { user, isNewUser } = await findOrCreateGoogleUser({ googleId, email, name, avatar });
  await acceptAllPendingInvitesForEmail(user);

  user.lastLogin = new Date();
  await user.save();

  const { accessToken, refreshToken } = issueAuthTokens(user);
  setAuthCookies(res, { accessToken, refreshToken });

  await writeAuditLog({
    actor: user._id,
    action: isNewUser ? 'USER_REGISTERED' : 'USER_LOGGED_IN',
    entityType: 'User',
    entityId: user._id,
    metadata: { provider: 'google' },
    req,
  });

  const memberships = await getMembershipsForUser(user._id);

  return sendSuccess(res, {
    statusCode: isNewUser ? 201 : 200,
    message: isNewUser ? 'Account created successfully' : 'Logged in successfully',
    data: { user: toPublicUser(user), memberships },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await verifyCredentials(email, password);

  user.lastLogin = new Date();
  await user.save();

  const { accessToken, refreshToken } = issueAuthTokens(user);
  setAuthCookies(res, { accessToken, refreshToken });

  const memberships = await getMembershipsForUser(user._id);

  await writeAuditLog({ actor: user._id, action: 'USER_LOGGED_IN', entityType: 'User', entityId: user._id, req });

  return sendSuccess(res, {
    message: 'Logged in successfully',
    data: { user: toPublicUser(user), memberships },
  });
});

export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await invalidateAllSessions(req.user._id);
    await writeAuditLog({ actor: req.user._id, action: 'USER_LOGGED_OUT', entityType: 'User', entityId: req.user._id, req });
  }
  clearAuthCookies(res);
  return sendSuccess(res, { message: 'Logged out successfully' });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || payload.tokenVersion !== user.refreshTokenVersion) {
    throw ApiError.unauthorized('Session expired, please log in again');
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id, user.refreshTokenVersion);
  setAuthCookies(res, { accessToken, refreshToken });

  return sendSuccess(res, {
    message: 'Session refreshed',
    data: { accessTokenExpiresIn: config.ACCESS_TOKEN_TTL },
  });
});

export const me = asyncHandler(async (req, res) => {
  const memberships = await getMembershipsForUser(req.user._id);
  return sendSuccess(res, {
    message: 'Current user',
    data: { user: toPublicUser(req.user), memberships },
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await createPasswordResetToken(email);

  if (result) {
    const resetUrl = `${config.CLIENT_URL}/reset-password?token=${result.rawToken}`;
    await sendEmail({
      to: result.user.email,
      subject: 'Reset your EventForge password',
      text: `Reset your password: ${resetUrl} (expires in 1 hour)`,
    });
    await writeAuditLog({
      actor: result.user._id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: result.user._id,
      req,
    });
  }

  // Always respond the same way, whether or not the account exists.
  return sendSuccess(res, {
    message: 'If an account exists for that email, a reset link has been sent',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const user = await resetPasswordWithToken(token, password);

  await writeAuditLog({ actor: user._id, action: 'PASSWORD_RESET_COMPLETED', entityType: 'User', entityId: user._id, req });

  return sendSuccess(res, { message: 'Password reset successfully. Please log in again.' });
});
