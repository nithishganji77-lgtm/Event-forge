import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  // These wait in real time (the 1 s minimum, a held request, the fade-out), so they get more room.
  describe('opening hand-off (the AI layer)', { timeout: 10_000 }, () => {
    const aiLayer = () => document.querySelector('[data-forge-transition]');

    // A status endpoint that answers only when the test says so, to prove the layer follows the
    // real request rather than a timer.
    function heldStatus(counter = { n: 0 }) {
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      server.use(
        http.get('http://localhost:4000/api/v1/organizations/org-1/ai/status', async () => {
          counter.n += 1;
          await gate;
          return HttpResponse.json({ success: true, data: { enabled: true } });
        })
      );
      return () => release();
    }

    it('covers the panel for as long as the availability check takes, not a fixed time, then reveals it', async () => {
      const user = userEvent.setup();
      const release = heldStatus();
      renderHeader('ORGANIZER');

      await user.click(screen.getByRole('button', { name: 'Open ForgeAI' }));
      expect(aiLayer()).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'ForgeAI' })).toBeInTheDocument();

      // Past the one-second minimum and the time its fade-out would take: the check is still out,
      // so the layer must still be up (a timer-driven layer would be gone by now).
      await new Promise((resolve) => setTimeout(resolve, 2000));
      expect(aiLayer()).toBeInTheDocument();

      release();
      expect(await screen.findByRole('tab', { name: 'Plan an event' })).toBeInTheDocument();
      await waitFor(() => expect(aiLayer()).not.toBeInTheDocument(), { timeout: 3000 });
    });

    it('ignores Escape during the hand-off, and closes ForgeAI on Escape once it is done', async () => {
      const user = userEvent.setup();
      const release = heldStatus();
      renderHeader('ORGANIZER');

      await user.click(screen.getByRole('button', { name: 'Open ForgeAI' }));
      await user.keyboard('{Escape}');
      expect(screen.getByRole('dialog', { name: 'ForgeAI' })).toBeInTheDocument();

      release();
      await screen.findByRole('tab', { name: 'Plan an event' });
      await waitFor(() => expect(aiLayer()).not.toBeInTheDocument(), { timeout: 3000 });
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });

    it('leaves when the check fails, so the panel can offer Try again', async () => {
      const user = userEvent.setup();
      server.use(
        http.get('http://localhost:4000/api/v1/organizations/org-1/ai/status', () =>
          HttpResponse.json({ success: false, error: { message: 'Down.' } }, { status: 503 })
        )
      );
      renderHeader('ORGANIZER');

      await user.click(screen.getByRole('button', { name: 'Open ForgeAI' }));
      expect(await screen.findByText("Couldn't reach ForgeAI")).toBeInTheDocument();
      await waitFor(() => expect(aiLayer()).not.toBeInTheDocument(), { timeout: 3000 });
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('plays once and asks once, however many clicks land', async () => {
      const counter = { n: 0 };
      const release = heldStatus(counter);
      renderHeader('ORGANIZER');

      const button = screen.getByRole('button', { name: 'Open ForgeAI' });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(document.querySelectorAll('[data-forge-transition]')).toHaveLength(1);
      release();
      await screen.findByRole('tab', { name: 'Plan an event' });
      expect(counter.n).toBe(1);
    });
  });
});
