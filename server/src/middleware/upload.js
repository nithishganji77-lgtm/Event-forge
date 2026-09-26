import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import { MAX_COVER_IMAGE_BYTES } from '../constants/limits.js';

const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// memoryStorage regardless of which storage adapter (Cloudinary/local-disk) ends up handling the
// buffer — keeps this config adapter-agnostic, matching the Phase 1 storage-adapter contract.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_COVER_IMAGE_BYTES },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
      return cb(ApiError.badRequest('The cover image must be a JPEG, PNG or WebP file.'));
    }
    cb(null, true);
  },
});
