import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// memoryStorage regardless of which storage adapter (Cloudinary/local-disk) ends up handling the
// buffer — keeps this config adapter-agnostic, matching the Phase 1 storage-adapter contract.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
      return cb(ApiError.badRequest('Cover image must be JPEG, PNG, or WebP'));
    }
    cb(null, true);
  },
});
