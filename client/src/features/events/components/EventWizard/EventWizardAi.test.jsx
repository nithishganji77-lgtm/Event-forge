import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { server } from '../../../../../tests/mocks/server.js';
import { createTestQueryClient } from '../../../../../tests/test-utils.jsx';
import { aiStatus, aiTask, draftResult, enhanceResult, venuesResult } from '../../../../../tests/fixtures/ai.js';
import { QUERY_KEYS } from '../../../../utils/constants.js';
import { EventWizard } from './EventWizard.jsx';

const membership = (role) => ({
  organizationId: 'org-1',
  organizationSlug: 'acme',
  organizationName: 'Acme',
  role,
  permissions: [],
});

const existingEvent = {
  _id: 'event-1',
  title: 'Existing event',
  description: 'The old description.',
  category: 'General',
  status: 'DRAFT',
  startDate: '2027-06-01T00:00:00.000Z',
  endDate: '2027-06-02T00:00:00.000Z',
  timezone: 'Asia/Kolkata',
  capacity: 50,
  organizers: [],
};

function renderWizard({ role = 'ORGANIZER', mode = 'create', event } = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(QUERY_KEYS.CURRENT_USER, {
    user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
    memberships: [membership(role)],
  });
  const path = mode === 'edit' ? '/org/acme/events/event-1/edit' : '/org/acme/events/new';

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/org/:orgSlug/events/new" element={<EventWizard mode="create" />} />
          <Route path="/org/:orgSlug/events/:eventId/edit" element={<EventWizard mode="edit" event={event} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const dialog = () => screen.getByRole('dialog', { name: 'ForgeAI' });
const next = (user) => user.click(screen.getByRole('button', { name: /next/i }));

async function draftInto(user, request = 'A hackathon for 40 engineers') {
  await user.click(screen.getByRole('button', { name: /draft with forgeai/i }));
  await user.type(await within(dialog()).findByLabelText('Describe the event'), request);
  await user.click(within(dialog()).getByRole('button', { name: /draft with forgeai/i }));
  await within(dialog()).findByRole('heading', { name: draftResult.title });
}

describe('EventWizard with ForgeAI', () => {
  it('fills the first step from a draft, and the venue name and capacity on the later ones', async () => {
    const user = userEvent.setup();
    server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult));
    renderWizard();

    await draftInto(user);
    await user.click(within(dialog()).getAllByRole('button', { name: 'Use as venue' })[1]);
    await user.click(within(dialog()).getByRole('button', { name: 'Use this draft' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Event name')).toHaveValue(draftResult.title);
    expect(screen.getByLabelText('Category')).toHaveValue('Workshop');
    const description = screen.getByLabelText('Description').value;
    expect(description).toContain(draftResult.tagline);
    expect(description).toContain(draftResult.description);
    expect(description).toContain('Agenda\nDay 1\n09:30 Welcome and kickoff - Doors open, badges at the desk');

    await next(user);
    expect(screen.getByLabelText('Venue name')).toHaveValue('Business hotel ballroom');
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2027-06-10' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2027-06-11' } });
    await next(user);
    expect(screen.getByLabelText('Maximum attendees')).toHaveValue(40);
    // The dates were chosen after the draft, so it had no start date to count back from.
    expect(screen.getByLabelText('Registration deadline (optional)')).toHaveValue('');
  });

  it('sets the registration deadline from a start date that was already chosen', async () => {
    const user = userEvent.setup();
    server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult));
    renderWizard();

    await user.type(screen.getByLabelText('Event name'), 'Placeholder');
    await next(user);
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2027-06-10' } });
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2027-06-11' } });
    await user.click(screen.getByRole('button', { name: /back/i }));

    await draftInto(user);
    await user.click(within(dialog()).getByRole('button', { name: 'Use this draft' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Replace and use this draft' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await next(user);
    await next(user);
    // 7 days before 10 June
    expect(screen.getByLabelText('Registration deadline (optional)')).toHaveValue('2027-06-03');
  });

  it('does not touch a venue name the person did not pick from the draft', async () => {
    const user = userEvent.setup();
    server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult));
    renderWizard();

    await draftInto(user);
    await user.click(within(dialog()).getByRole('button', { name: 'Use this draft' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await next(user);
    expect(screen.getByLabelText('Venue name')).toHaveValue('');
  });

  it('asks before replacing a name the person already typed, and keeps it if they say so', async () => {
    const user = userEvent.setup();
    server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult));
    renderWizard();

    await user.type(screen.getByLabelText('Event name'), 'My own name');
    await draftInto(user);
    await user.click(within(dialog()).getByRole('button', { name: 'Use this draft' }));

    expect(within(dialog()).getByRole('status')).toHaveTextContent('replaces the name and description you have already written');
    await user.click(within(dialog()).getByRole('button', { name: 'Keep what I wrote' }));
    expect(screen.getByLabelText('Event name')).toHaveValue('My own name');
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(within(dialog()).getByRole('button', { name: 'Use this draft' }));
    await user.click(within(dialog()).getByRole('button', { name: 'Replace and use this draft' }));
    await waitFor(() => expect(screen.getByLabelText('Event name')).toHaveValue(draftResult.title));
  });

  it('polishes the description that is already there, and replaces it only on "Use this text"', async () => {
    const user = userEvent.setup();
    server.use(aiStatus('org-1'), aiTask('org-1', 'enhance', 'enhance', enhanceResult));
    renderWizard();

    await user.type(screen.getByLabelText('Description'), 'we are having an offsite');
    await user.click(screen.getByRole('button', { name: /polish with forgeai/i }));

    expect(await within(dialog()).findByRole('tab', { name: 'Polish text', selected: true })).toBeInTheDocument();
    expect(within(dialog()).getByLabelText('Text to polish')).toHaveValue('we are having an offsite');

    await user.click(within(dialog()).getByRole('button', { name: 'More professional' }));
    await within(dialog()).findByRole('region', { name: "ForgeAI's version" });
    expect(screen.getByLabelText('Description')).toHaveValue('we are having an offsite');

    await user.click(within(dialog()).getByRole('button', { name: 'Use this text' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('Description')).toHaveValue(enhanceResult.text);
  });

  it('puts a venue suggestion in the venue name', async () => {
    const user = userEvent.setup();
    server.use(aiStatus('org-1'), aiTask('org-1', 'venues', 'venues', venuesResult));
    renderWizard();

    await user.type(screen.getByLabelText('Event name'), 'Leadership offsite'); // Next needs a name
    await user.click(screen.getByRole('button', { name: /draft with forgeai/i }));
    await user.click(await within(dialog()).findByRole('tab', { name: 'Venues' }));
    await user.type(within(dialog()).getByLabelText('What is the event?'), 'An offsite');
    await user.type(within(dialog()).getByLabelText('How many people?'), '40');
    await user.click(within(dialog()).getByRole('button', { name: 'Find venues' }));
    await user.click((await within(dialog()).findAllByRole('button', { name: 'Use as venue' }))[0]);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await next(user);
    expect(screen.getByLabelText('Venue name')).toHaveValue('Resort with a conference hall');
  });

  it('shows no ForgeAI controls to someone who cannot create events', () => {
    renderWizard({ role: 'EMPLOYEE' });

    expect(screen.getByLabelText('Event name')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /forgeai/i })).not.toBeInTheDocument();
  });

  it('offers only the polisher when editing an existing event, and never a draft to swap in', async () => {
    const user = userEvent.setup();
    server.use(aiStatus('org-1'), aiTask('org-1', 'draft', 'draft', draftResult));
    renderWizard({ mode: 'edit', event: existingEvent });

    expect(screen.queryByRole('button', { name: /draft with forgeai/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /polish with forgeai/i }));
    expect(within(await screen.findByRole('dialog', { name: 'ForgeAI' })).getByLabelText('Text to polish')).toHaveValue('The old description.');

    await user.click(within(dialog()).getByRole('tab', { name: 'Plan an event' }));
    await user.type(within(dialog()).getByLabelText('Describe the event'), 'Something');
    await user.click(within(dialog()).getByRole('button', { name: /draft with forgeai/i }));
    await within(dialog()).findByRole('heading', { name: draftResult.title });
    expect(within(dialog()).queryByRole('button', { name: 'Use this draft' })).not.toBeInTheDocument();
  });
});
