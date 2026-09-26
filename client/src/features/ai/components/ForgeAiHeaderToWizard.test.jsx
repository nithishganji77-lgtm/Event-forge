import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { server } from '../../../../tests/mocks/server.js';
import { createTestQueryClient } from '../../../../tests/test-utils.jsx';
import { aiStatus, aiTask, draftResult } from '../../../../tests/fixtures/ai.js';
import { QUERY_KEYS } from '../../../utils/constants.js';
import { EventWizard } from '../../events/components/EventWizard/EventWizard.jsx';
import { ForgeAiButton } from './ForgeAiButton.jsx';

function renderHeader() {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(QUERY_KEYS.CURRENT_USER, {
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    memberships: [{ organizationId: 'org-1', organizationSlug: 'acme', organizationName: 'Acme', role: 'ORGANIZER', permissions: [] }],
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/org/acme/dashboard']}>
        <Routes>
          <Route path="/org/:orgSlug/dashboard" element={<ForgeAiButton />} />
          <Route path="/org/:orgSlug/events/new" element={<EventWizard mode="create" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// The header has no form to fill, so a draft used from there travels to the new-event wizard as
// navigation state and becomes its starting values.
describe('ForgeAI from the app header to the event wizard', () => {
  it('opens the new-event wizard with the draft in it', async () => {
    const user = userEvent.setup();
    server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult));
    renderHeader();

    await user.click(screen.getByRole('button', { name: 'Open ForgeAI' }));
    const dialog = await screen.findByRole('dialog', { name: 'ForgeAI' });
    await user.type(await within(dialog).findByLabelText('Describe the event'), 'A hackathon for 40 engineers');
    await user.click(within(dialog).getByRole('button', { name: /draft with forgeai/i }));
    await user.click((await within(dialog).findAllByRole('button', { name: 'Use as venue' }))[0]);
    await user.click(within(dialog).getByRole('button', { name: 'Use this draft' }));

    // No "replace what you wrote" question here: there is no form yet, so nothing to replace.
    expect(await screen.findByLabelText('Event name')).toHaveValue(draftResult.title);
    expect(screen.getByLabelText('Category')).toHaveValue('Workshop');
    expect(screen.getByLabelText('Description').value).toContain(draftResult.description);
    expect(screen.getByText(/Filled in by ForgeAI/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByLabelText('Venue name')).toHaveValue('Tech campus event hall');
    fireEventDates();
    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByLabelText('Maximum attendees')).toHaveValue(40);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

// Dates are needed to get past the venue step; the draft has none of its own.
function fireEventDates() {
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2027-06-10' } });
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2027-06-11' } });
}
