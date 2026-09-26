import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getErrorInfo, extractErrorMessage } from './errors.js';

// A request that failed because the answer was "no" (bad input, not signed in, not allowed, not
// found) gets the same answer when repeated, so retrying only makes the person wait for the error.
// A dropped connection or a server hiccup is worth one more try.
const NO_RETRY_STATUSES = new Set([400, 401, 403, 404, 409, 413, 422]);

// Actions that have no form or dialog of their own to show a failure in (register, publish,
// change a role, mark attendance...) opt in with `meta: { errorToast: 'Could not do X' }`, and a
// failure surfaces as a toast: what failed, then why. Without it they failed silently.
export function createMutationCache() {
  return new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const title = mutation.meta?.errorToast;
      if (title) toast.error(title, { description: extractErrorMessage(error) });
    },
  });
}

export function shouldRetryQuery(failureCount, error) {
  const { status } = getErrorInfo(error);
  return !NO_RETRY_STATUSES.has(status) && failureCount < 1;
}

// `networkMode: 'always'`: by default TanStack Query PAUSES a request while the browser reports it is
// offline and waits, silently, so the page sat blank with no spinner and no error. Sending it anyway
// makes it fail fast into the "can't reach EventForge" message and a Try again button.
export const queryClient = new QueryClient({
  mutationCache: createMutationCache(),
  defaultOptions: {
    mutations: { networkMode: 'always' },
    queries: {
      networkMode: 'always',
      staleTime: 30 * 1000,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
    },
  },
});
