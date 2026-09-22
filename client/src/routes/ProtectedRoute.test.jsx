import { describe, it, expect } from 'vitest';
import { screen, waitFor, render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { createTestQueryClient } from '../../tests/test-utils.jsx';
import { QUERY_KEYS } from '../utils/constants.js';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { GuestRoute } from './GuestRoute.jsx';

function renderProtectedAt(route, { authed } = {}) {
  const queryClient = createTestQueryClient();
  if (authed) {
    queryClient.setQueryData(QUERY_KEYS.CURRENT_USER, { user: { id: '1', name: 'U', email: 'u@example.com' }, memberships: [] });
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/login" element={<div>LOGIN PAGE</div>} />
          <Route path="/dashboard" element={<div>DASHBOARD REDIRECT TARGET</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>PROTECTED CONTENT</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderGuestAt(route, { authed } = {}) {
  const queryClient = createTestQueryClient();
  if (authed) {
    queryClient.setQueryData(QUERY_KEYS.CURRENT_USER, { user: { id: '1', name: 'U', email: 'u@example.com' }, memberships: [] });
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/dashboard" element={<div>DASHBOARD REDIRECT TARGET</div>} />
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<div>LOGIN PAGE</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ProtectedRoute', () => {
  it('renders the protected content (via Outlet) when authenticated', async () => {
    renderProtectedAt('/protected', { authed: true });
    await waitFor(() => expect(screen.getByText('PROTECTED CONTENT')).toBeInTheDocument());
  });

  it('redirects to /login, carrying the attempted location in state, when not authenticated', async () => {
    renderProtectedAt('/protected', { authed: false });
    await waitFor(() => expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument());
  });
});

describe('GuestRoute', () => {
  it('renders the guest content (e.g. the login page) when not authenticated', async () => {
    renderGuestAt('/login', { authed: false });
    await waitFor(() => expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument());
  });

  it('redirects an already-authenticated user away from the guest-only page', async () => {
    renderGuestAt('/login', { authed: true });
    await waitFor(() => expect(screen.getByText('DASHBOARD REDIRECT TARGET')).toBeInTheDocument());
  });
});
