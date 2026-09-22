import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { screen, waitFor, render, fireEvent } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { toast } from 'sonner';
import { server } from '../../../../../tests/mocks/server.js';
import { createTestQueryClient } from '../../../../../tests/test-utils.jsx';
import { QUERY_KEYS } from '../../../../utils/constants.js';
import { EventWizard } from './EventWizard.jsx';

const BASE = 'http://localhost:4000/api/v1';

const membership = {
  organizationId: 'org-1',
  organizationSlug: 'acme',
  organizationName: 'Acme',
  role: 'ORGANIZER',
  permissions: [],
};

// Every field the wizard's schema requires beyond eventFormDefaults' own valid defaults
// (capacity:50, category:'General', timezone already filled) is just title + the two dates —
// this keeps the walk-through below to 3 real interactions instead of typing every field.
function renderWizard() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(QUERY_KEYS.CURRENT_USER, {
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    memberships: [membership],
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/org/acme/events/new']}>
        <Routes>
          <Route path="/org/:orgSlug/events/new" element={<EventWizard mode="create" />} />
          <Route path="/org/:orgSlug/events/:eventId" element={<div>EVENT DETAIL PAGE</div>} />
          <Route path="/org/:orgSlug/events/:eventId/edit" element={<div>EVENT EDIT PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { queryClient };
}

function membersHandler() {
  return http.get(`${BASE}/organizations/:orgId/members`, () =>
    HttpResponse.json({ success: true, data: [], message: 'Success', pagination: { page: 1, limit: 100, total: 0, totalPages: 1 } })
  );
}

async function goToReviewStep(user) {
  await user.type(screen.getByLabelText('Event name'), 'Annual Summit');
  await user.click(screen.getByRole('button', { name: /next/i }));

  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2027-06-01' } });
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2027-06-02' } });
  await user.click(screen.getByRole('button', { name: /next/i }));

  await user.click(screen.getByRole('button', { name: /next/i })); // Capacity — already valid (defaults to 50)

  await waitFor(() => expect(screen.getByText('Select members')).toBeInTheDocument()); // Organizers step loaded
  await user.click(screen.getByRole('button', { name: /next/i }));

  await waitFor(() => expect(screen.getByText('Review')).toBeInTheDocument());
}

describe('EventWizard', () => {
  it('blocks Next when the current step has an invalid field, and stays on that step', async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByText('Title is too short')).toBeInTheDocument();
    expect(screen.getByLabelText('Event name')).toBeInTheDocument();
    expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument();
  });

  // The Phase-3 regression this file exists to guard: usePublishEvent isn't used in create mode
  // because it closes over event?._id at hook-creation time (undefined, since there's no event
  // yet) — persistEvent must call publishEventRequest with the id the create call just returned.
  it('publishes using the freshly-created event id, not a stale/undefined one', async () => {
    const user = userEvent.setup();
    let publishedEventId = null;
    server.use(
      membersHandler(),
      http.post(`${BASE}/organizations/:orgId/events`, () =>
        HttpResponse.json({ success: true, data: { event: { _id: 'fresh-event-id', title: 'Annual Summit' } } })
      ),
      http.post(`${BASE}/events/:eventId/publish`, ({ params }) => {
        publishedEventId = params.eventId;
        return HttpResponse.json({ success: true, data: { event: { _id: params.eventId, status: 'PUBLISHED' } } });
      })
    );

    renderWizard();
    await goToReviewStep(user);
    await user.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => expect(screen.getByText('EVENT DETAIL PAGE')).toBeInTheDocument());
    expect(publishedEventId).toBe('fresh-event-id');
  });

  it('navigates to the real edit page with a toast when create succeeds but publish fails', async () => {
    const user = userEvent.setup();
    const toastErrorSpy = vi.spyOn(toast, 'error').mockImplementation(() => {});
    server.use(
      membersHandler(),
      http.post(`${BASE}/organizations/:orgId/events`, () =>
        HttpResponse.json({ success: true, data: { event: { _id: 'fresh-event-id', title: 'Annual Summit' } } })
      ),
      http.post(`${BASE}/events/:eventId/publish`, () =>
        HttpResponse.json({ success: false, error: { message: 'Publish failed' } }, { status: 500 })
      )
    );

    renderWizard();
    await goToReviewStep(user);
    await user.click(screen.getByRole('button', { name: /publish/i }));

    await waitFor(() => expect(screen.getByText('EVENT EDIT PAGE')).toBeInTheDocument());
    expect(toastErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Publish failed'));

    toastErrorSpy.mockRestore();
  });
});
