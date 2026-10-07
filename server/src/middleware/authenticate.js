import { verifyAccessToken } from '../services/token.service.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) {
    throw ApiError.unauthorized();
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || payload.tokenVersion !== user.refreshTokenVersion) {
    throw ApiError.unauthorized();
  }

  req.user = user;
  next();
});
