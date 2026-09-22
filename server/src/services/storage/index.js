import { cloudinaryConfigured } from '../../config/env.js';
import { cloudinaryAdapter } from './cloudinary.adapter.js';
import { localAdapter } from './local.adapter.js';

// Selected once at boot from env vars. Callers only ever deal in the returned url string —
// swapping adapters (e.g. adding real Cloudinary credentials later) needs no other code change.
export const storage = cloudinaryConfigured ? cloudinaryAdapter : localAdapter;
