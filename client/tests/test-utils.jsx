import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render } from '@testing-library/react';
import { QUERY_KEYS } from '../src/utils/constants.js';

// No existing test-QueryClient factory anywhere in the app (confirmed) — retry:false everywhere
// so a deliberately-failing mock response doesn't retry and slow the test down.
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(ui, { route = '/', queryClient = createTestQueryClient() } = {}) {
  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper }) };
}

// Several components (RequirePermission, OrgLayoutRoute, ...) resolve their org context from
// useParams()'s :orgSlug matched against the QueryClient's cached CURRENT_USER memberships —
// this seeds both, so a test only has to state "as this membership, at this org."
export function renderAtOrgRoute(ui, { orgSlug, memberships = [], user = { id: 'user-1', name: 'Test User', email: 'test@example.com' } } = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(QUERY_KEYS.CURRENT_USER, { user, memberships });

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/org/${orgSlug}`]}>
          <Routes>
            <Route path="/org/:orgSlug" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper }) };
}

export * from '@testing-library/react';
