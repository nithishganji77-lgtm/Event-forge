// Runs before any test file (or its imports) via jest.config.js's setupFiles — must set every
// required (no-default, non-optional) field config/env.js's zod schema expects, since that schema
// is parsed the moment anything imports env.js (app.js does, transitively, on the very first test
// file's `import app from '../src/app.js'`). dotenv/config (imported inside env.js) never
// overwrites an already-set process.env key, so setting these here first is what makes them win
// over whatever a real server/.env on disk might contain.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unused-jest-satisfies-schema-only';
process.env.CLIENT_URL = 'http://localhost:5175';
process.env.JWT_SECRET = 'test-jwt-secret-not-for-prod-0000000000';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-not-for-prod-0000';

// Explicitly blank every optional third-party credential, rather than leaving them for dotenv to
// fill in from a real server/.env — otherwise tests would silently exercise real Resend/SMTP/
// Cloudinary/Google calls using whatever live credentials happen to be configured on the machine
// running them (confirmed the hard way: forgot-password tests were actually calling the real
// Resend API and failing on its sandbox-mode recipient-domain validation). An empty string is
// falsy for each `xConfigured = Boolean(config.X)` check, same as truly unset.
process.env.RESEND_API_KEY = '';
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';
process.env.GOOGLE_CLIENT_ID = '';
