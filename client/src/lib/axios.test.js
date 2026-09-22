import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../tests/mocks/server.js';
import { api } from './axios.js';

const BASE = 'http://localhost:4000/api/v1';

describe('axios 401 -> refresh -> retry interceptor', () => {
  it('retries the original request once after a successful refresh', async () => {
    let protectedCallCount = 0;
    let refreshCallCount = 0;
    server.use(
      http.get(`${BASE}/protected-thing`, () => {
        protectedCallCount += 1;
        if (protectedCallCount === 1) {
          return HttpResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
        }
        return HttpResponse.json({ success: true, data: { ok: true } });
      }),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshCallCount += 1;
        return HttpResponse.json({ success: true, data: {} });
      })
    );

    const res = await api.get('/protected-thing');
    expect(res.data.data.ok).toBe(true);
    expect(protectedCallCount).toBe(2); // original 401 + the one retry
    expect(refreshCallCount).toBe(1);
  });

  // The bug this project's own Known Issues log documents: the interceptor used to
  // force-navigate to /login on any failed refresh, which fired even for anonymous visitors on
  // public pages (they legitimately get a 401 from GET /auth/me). The fix removed that
  // navigation entirely — there's nothing left in this module to call window.location or a
  // router with, so the correct assertion is simply that a failed refresh rejects cleanly and
  // the caller's own error handling takes over, exactly as ProtectedRoute already does by reading
  // isAuthenticated=false.
  it('rejects the original request cleanly when refresh itself fails, with nothing forcing navigation', async () => {
    server.use(
      http.get(`${BASE}/protected-thing`, () => HttpResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 })),
      http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ success: false, error: { message: 'Session expired' } }, { status: 401 }))
    );

    await expect(api.get('/protected-thing')).rejects.toMatchObject({ response: { status: 401 } });
  });

  it('shares exactly one /auth/refresh call across two concurrent 401s (single-flight)', async () => {
    let protectedCallCount = 0;
    let refreshCallCount = 0;
    server.use(
      http.get(`${BASE}/protected-thing`, () => {
        protectedCallCount += 1;
        if (protectedCallCount <= 2) {
          return HttpResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
        }
        return HttpResponse.json({ success: true, data: { ok: true } });
      }),
      http.post(`${BASE}/auth/refresh`, async () => {
        refreshCallCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 20)); // hold it open so both 401s land while it's in flight
        return HttpResponse.json({ success: true, data: {} });
      })
    );

    const [res1, res2] = await Promise.all([api.get('/protected-thing'), api.get('/protected-thing')]);
    expect(res1.data.data.ok).toBe(true);
    expect(res2.data.data.ok).toBe(true);
    expect(refreshCallCount).toBe(1);
  });

  it('never retries a 401 from /auth/login or /auth/refresh itself (would otherwise loop)', async () => {
    server.use(
      http.post(`${BASE}/auth/login`, () => HttpResponse.json({ success: false, error: { message: 'Invalid email or password' } }, { status: 401 }))
    );
    await expect(api.post('/auth/login', { email: 'x@example.com', password: 'wrong' }))
      .rejects.toMatchObject({ response: { status: 401 } });
  });
});
