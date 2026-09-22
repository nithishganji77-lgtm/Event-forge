import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:4000/api/v1';

// Base handlers for only the endpoints the test suite actually exercises — overridden per-test
// via server.use(...) for error-path scenarios. Kept deliberately small rather than a full mock
// backend.
export const handlers = [
  http.get(`${BASE}/auth/me`, () => HttpResponse.json({ success: false, error: { message: 'Not authenticated' } }, { status: 401 })),

  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = await request.json();
    if (body.password === 'wrong') {
      return HttpResponse.json({ success: false, error: { message: 'Invalid email or password' } }, { status: 401 });
    }
    return HttpResponse.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: { id: 'user-1', name: 'Test User', email: body.email, avatar: null, isActive: true },
        memberships: [],
      },
    });
  }),

  http.post(`${BASE}/auth/refresh`, () => HttpResponse.json({ success: true, message: 'Session refreshed', data: {} })),
];
