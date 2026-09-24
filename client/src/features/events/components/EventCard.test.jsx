import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, within } from '@testing-library/react';
import { renderAtOrgRoute } from '../../../../tests/test-utils.jsx';
import { EventCard } from './EventCard.jsx';

const NOW = Date.UTC(2026, 8, 24, 10, 0, 0);

const membership = (role) => ({
  organizationId: 'org-1',
  organizationSlug: 'acme',
  organizationName: 'Acme',
  role,
  permissions: [],
});

const baseEvent = {
  _id: 'event-1',
  organization: 'org-1',
  title: 'Annual Summit',
  category: 'Conference',
  status: 'PUBLISHED',
  displayStatus: 'REGISTRATION_OPEN',
  startDate: '2026-10-05T00:00:00.000Z',
  endDate: '2026-10-05T00:00:00.000Z',
  startTime: '18:00',
  startsAt: '2026-10-05T12:30:00.000Z',
  venue: { name: 'Main Hall' },
  capacity: 200,
  registeredCount: 42,
  waitlistedCount: 0,
  createdBy: 'user-1',
  organizers: [],
  coverImage: '',
};

function renderCard(props, { role = 'ORG_ADMIN', userId = 'user-1' } = {}) {
  return renderAtOrgRoute(<EventCard event={baseEvent} {...props} />, {
    orgSlug: 'acme',
    memberships: [membership(role)],
    user: { id: userId, name: 'U', email: 'u@example.com' },
  });
}

describe('EventCard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('shows the event at a glance: title, category, when, venue, capacity, status', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Annual Summit' })).toBeInTheDocument();
    expect(screen.getByText('Conference')).toBeInTheDocument();
    expect(screen.getByText(/Oct 5 · 6:00 PM/)).toBeInTheDocument();
    expect(screen.getByText('Main Hall')).toBeInTheDocument();
    expect(screen.getByText('42 / 200')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('links to the event detail page, with an accessible name that includes the title', () => {
    renderCard();
    expect(screen.getByRole('link', { name: 'View Annual Summit' })).toHaveAttribute('href', '/org/acme/events/event-1');
  });

  it('draws a generated banner when there is no cover image', () => {
    renderCard();
    expect(screen.getByTestId('generated-cover')).toBeInTheDocument();
  });

  it('mentions closed registration as small text rather than a different status', () => {
    renderCard({ event: { ...baseEvent, displayStatus: 'REGISTRATION_CLOSED' } });
    expect(screen.getByText('Registration closed')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('shows LIVE for an ongoing event', () => {
    renderCard({ event: { ...baseEvent, displayStatus: 'ONGOING' } });
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows the register control instead of View when showRegisterButton is set', () => {
    renderCard({ showRegisterButton: true }, { role: 'EMPLOYEE', userId: 'user-9' });
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View Annual Summit' })).not.toBeInTheDocument();
  });

  it('keeps the register control out of the link (no interactive content inside <a>)', () => {
    renderCard({ showRegisterButton: true }, { role: 'EMPLOYEE', userId: 'user-9' });
    const links = screen.getAllByRole('link');
    for (const link of links) {
      expect(within(link).queryByRole('button')).not.toBeInTheDocument();
    }
  });

  describe('the ⋯ menu', () => {
    it('is absent unless showActions is set', () => {
      renderCard();
      expect(screen.queryByRole('button', { name: /more actions/i })).not.toBeInTheDocument();
    });

    it('offers every action to an admin', async () => {
      const user = userEvent.setup();
      renderCard({ showActions: true });
      await user.click(screen.getByRole('button', { name: 'More actions for Annual Summit' }));
      const labels = screen.getAllByRole('menuitem').map((item) => item.textContent);
      expect(labels).toEqual(['Edit event', 'Manage attendees', 'Duplicate', 'Copy link', 'Cancel event', 'Delete event']);
    });

    it('points Manage attendees at the attendees tab', async () => {
      const user = userEvent.setup();
      renderCard({ showActions: true });
      await user.click(screen.getByRole('button', { name: /more actions/i }));
      expect(screen.getByRole('menuitem', { name: 'Manage attendees' })).toHaveAttribute(
        'href',
        '/org/acme/events/event-1?tab=attendees'
      );
    });

    it("gives an organizer their own event's actions, minus delete", async () => {
      const user = userEvent.setup();
      renderCard({ showActions: true }, { role: 'ORGANIZER', userId: 'user-1' });
      await user.click(screen.getByRole('button', { name: /more actions/i }));
      const labels = screen.getAllByRole('menuitem').map((item) => item.textContent);
      expect(labels).toEqual(['Edit event', 'Manage attendees', 'Duplicate', 'Copy link', 'Cancel event']);
    });

    it("gives an organizer only Copy link on someone else's event", async () => {
      const user = userEvent.setup();
      renderCard({ event: { ...baseEvent, createdBy: 'someone-else' }, showActions: true }, { role: 'ORGANIZER', userId: 'user-1' });
      await user.click(screen.getByRole('button', { name: /more actions/i }));
      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Copy link']);
    });

    it('hides Cancel for an event that is already cancelled', async () => {
      const user = userEvent.setup();
      renderCard({ event: { ...baseEvent, status: 'CANCELLED', displayStatus: 'CANCELLED' }, showActions: true });
      await user.click(screen.getByRole('button', { name: /more actions/i }));
      expect(screen.queryByRole('menuitem', { name: 'Cancel event' })).not.toBeInTheDocument();
    });

    it('copies the absolute event link', async () => {
      const user = userEvent.setup();
      renderCard({ showActions: true });
      await user.click(screen.getByRole('button', { name: /more actions/i }));
      await user.click(screen.getByRole('menuitem', { name: 'Copy link' }));
      expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/org/acme/events/event-1`);
    });

    it('opens the confirm dialog for a destructive action, and closes the menu', async () => {
      const user = userEvent.setup();
      renderCard({ showActions: true });
      await user.click(screen.getByRole('button', { name: /more actions/i }));
      await user.click(screen.getByRole('menuitem', { name: 'Delete event' }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      // The panel stays mounted for its exit animation, so wait for it to go.
      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    });
  });

  describe('compact variant', () => {
    it('is the dense text card: no banner, no capacity bar, no menu', () => {
      renderCard({ variant: 'compact', showActions: true });
      expect(screen.getByRole('heading', { name: 'Annual Summit' })).toBeInTheDocument();
      expect(screen.getByText('42 / 200 registered')).toBeInTheDocument();
      expect(screen.queryByTestId('generated-cover')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /more actions/i })).not.toBeInTheDocument();
    });
  });
});
