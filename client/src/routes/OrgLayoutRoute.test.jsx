import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor, render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { createTestQueryClient } from '../../tests/test-utils.jsx';
import { QUERY_KEYS } from '../utils/constants.js';

// Isolates OrgLayoutRoute's own redirect logic from DashboardLayout's internals (sidebar,
// notification polling, etc.) — this test is about which of the 3 branches OrgLayoutRoute takes,
// not about what the dashboard shell itself renders.
vi.mock('../layouts/DashboardLayout.jsx', () => ({
  DashboardLayout: () => <div>DASHBOARD LAYOUT RENDERED</div>,
}));

const { OrgLayoutRoute } = await import('./OrgLayoutRoute.jsx');

function renderAt(route, memberships) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(QUERY_KEYS.CURRENT_USER, { user: { id: '1', name: 'U', email: 'u@example.com' }, memberships });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/onboarding" element={<div>ONBOARDING PAGE</div>} />
          {/* Wildcard so the stale-slug redirect target (/org/<validSlug>/dashboard) re-matches
              the same route, exactly like the real app's `/org/:orgSlug` parent-with-children
              tree does — the real OrgLayoutRoute only ever redirects to a *sibling* path under
              the same :orgSlug prefix, never somewhere this route wouldn't also match. */}
          <Route path="/org/:orgSlug/*" element={<OrgLayoutRoute />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const membership = { organizationId: 'org-1', organizationSlug: 'acme', organizationName: 'Acme', role: 'SUPER_ADMIN', permissions: [] };

describe('OrgLayoutRoute', () => {
  it('renders DashboardLayout when the URL slug matches a real membership', async () => {
    renderAt('/org/acme', [membership]);
    await waitFor(() => expect(screen.getByText('DASHBOARD LAYOUT RENDERED')).toBeInTheDocument());
  });

  it('redirects to onboarding when the user has zero memberships', async () => {
    renderAt('/org/acme', []);
    await waitFor(() => expect(screen.getByText('ONBOARDING PAGE')).toBeInTheDocument());
  });

  it('redirects to the first valid org when the URL slug matches nothing (stale bookmark / removed member)', async () => {
    renderAt('/org/some-typo-slug', [membership]);
    await waitFor(() => expect(screen.getByText('DASHBOARD LAYOUT RENDERED')).toBeInTheDocument());
    // i.e. it landed back on OrgLayoutRoute at the real slug, not a dead end.
  });
});
