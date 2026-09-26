import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { server } from '../../../../tests/mocks/server.js';
import { createTestQueryClient } from '../../../../tests/test-utils.jsx';
import { aiStatus } from '../../../../tests/fixtures/ai.js';
import { QUERY_KEYS } from '../../../utils/constants.js';
import { ForgeAiButton } from './ForgeAiButton.jsx';

function renderHeader(role) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(QUERY_KEYS.CURRENT_USER, {
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    memberships: [{ organizationId: 'org-1', organizationSlug: 'acme', organizationName: 'Acme', role, permissions: [] }],
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/org/acme/dashboard']}>
        <Routes>
          <Route path="/org/:orgSlug/dashboard" element={<ForgeAiButton />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('ForgeAiButton', () => {
  it.each(['SUPER_ADMIN', 'ORG_ADMIN', 'ORGANIZER'])('is shown to %s', (role) => {
    renderHeader(role);
    expect(screen.getByRole('button', { name: 'Open ForgeAI' })).toBeInTheDocument();
  });

  it('is not shown to an employee, who cannot create events', () => {
    renderHeader('EMPLOYEE');
    expect(screen.queryByRole('button', { name: 'Open ForgeAI' })).not.toBeInTheDocument();
  });

  it('asks the server nothing until it is opened', async () => {
    const user = userEvent.setup();
    let statusRequests = 0;
    server.use(
      http.get('http://localhost:4000/api/v1/organizations/org-1/ai/status', () => {
        statusRequests += 1;
        return HttpResponse.json({ success: true, data: { enabled: true } });
      })
    );
    renderHeader('ORGANIZER');

    expect(statusRequests).toBe(0);
    await user.click(screen.getByRole('button', { name: 'Open ForgeAI' }));
    expect(await screen.findByRole('tab', { name: 'Plan an event' })).toBeInTheDocument();
    expect(statusRequests).toBe(1);
  });

  it('opens the disabled explanation when the server has no key', async () => {
    const user = userEvent.setup();
    server.use(aiStatus('org-1', false));
    renderHeader('ORGANIZER');

    await user.click(screen.getByRole('button', { name: 'Open ForgeAI' }));
    expect(await screen.findByText("ForgeAI isn't set up yet")).toBeInTheDocument();
  });
});
