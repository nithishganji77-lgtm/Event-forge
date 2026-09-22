import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // Optional: Google-only accounts have no password. Presence of password/googleId is what
    // determines which sign-in methods work for a given account (no separate provider enum).
    password: { type: String, default: null, select: false },
    // No `default` here deliberately: a sparse unique index only excludes documents where the
    // field is truly absent. `default: null` would write an explicit null onto every local-auth
    // user, which sparse still indexes — the second such user would collide on a duplicate key.
    googleId: { type: String, unique: true, sparse: true, select: false },
    avatar: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },

    // Additive fields required by the requested auth flows (not in the literal spec list):
    refreshTokenVersion: { type: Number, default: 0 },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
