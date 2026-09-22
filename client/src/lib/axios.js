import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
});

let refreshPromise = null;

// Single-flight 401 -> refresh -> retry-once. Concurrent 401s share one refresh call instead of
// each firing their own, and a request to /auth/refresh or /auth/login itself never retries.
//
// Deliberately does NOT force-navigate on refresh failure: a 401 here just as often means "an
// anonymous visitor is on a public page" (landing/login/register all call GET /auth/me to know
// whether to show a logged-in nav) as it means "a session expired mid-use." Forcing a hard
// redirect for the former would nuke the SPA out from under an anonymous visitor. Real
// session-expiry redirects are handled by ProtectedRoute reading isAuthenticated=false and
// navigating client-side instead.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config: originalRequest, response } = error;

    const isAuthEndpoint = originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/login');

    if (response?.status !== 401 || isAuthEndpoint || originalRequest._retried) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    try {
      refreshPromise ??= api.post('/auth/refresh').finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

export function extractErrorMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.error?.message || fallback;
}
