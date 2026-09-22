import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, afterAll, beforeAll, vi } from 'vitest';
import { server } from './mocks/server.js';

// jsdom has no <canvas> 2D context (would need the native `canvas` package just for this), and
// lottie-web's real player touches one at import time — every Spinner render would otherwise
// crash any test file that mounts it, even indirectly (route guards' loading state, the event
// wizard's Organizers step, etc). Stubbed globally, the same way OrgLayoutRoute.test.jsx already
// isolates itself from DashboardLayout's own heavy internals.
vi.mock('lottie-react', () => ({
  Lottie: () => null,
  LottieLight: () => null,
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
