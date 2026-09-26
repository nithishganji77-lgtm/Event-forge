import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { screen, waitFor, within } from '@testing-library/react';
import { server } from '../../../../tests/mocks/server.js';
import { renderAtOrgRoute } from '../../../../tests/test-utils.jsx';
import { ManagerDashboard } from './ManagerDashboard.jsx';
import { EmployeeDashboard } from './EmployeeDashboard.jsx';

const BASE = 'http://localhost:4000/api/v1';
const ORG = 'org-1';

const membership = (role) => ({
  organizationId: ORG,
  organizationSlug: 'acme',
  organizationName: 'Acme Corp',
  role,
  permissions: [],
});

const summary = {
  upcomingEvents: 3,
  startingNext7Days: 2,
  registeredAttendees: 148,
  newRegistrationsThisMonth: 39,
  newRegistrationsLastMonth: 50,
  eventsThisMonth: 7,
  eventsLastMonth: 3,
  pendingActions: { total: 4, drafts: 2, pendingInvites: 2 },
};

const event = (overrides) => ({
  _id: 'event-1',
  organization: ORG,
  title: 'Product Launch Webinar',
  category: 'Webinar',
  status: 'PUBLISHED',
  displayStatus: 'REGISTRATION_OPEN',
  startDate: '2026-10-05T00:00:00.000Z',
  endDate: '2026-10-05T00:00:00.000Z',
  startTime: '18:00',
  startsAt: '2026-10-05T12:30:00.000Z',
  venue: { name: 'Online' },
  capacity: 100,
  registeredCount: 12,
  waitlistedCount: 0,
  createdBy: 'user-1',
  organizers: [],
  coverImage: '',
  ...overrides,
});

const activity = [
  { _id: 'a1', action: 'REGISTRATION_CREATED', actor: { name: 'Sneha Iyer' }, createdAt: new Date().toISOString(),
    metadata: { eventId: 'event-1', eventTitle: 'Product Launch Webinar' } },
  { _id: 'a2', action: 'REGISTRATION_CREATED', actor: { name: 'Kabir Rao' }, createdAt: new Date().toISOString(),
    metadata: { eventId: 'event-1', eventTitle: 'Product Launch Webinar', promotedFromWaitlist: true } },
];

// Every request a dashboard makes, recorded so a test can assert on the query it sent.
let eventRequests;
function serveDashboard({ eventsByStatus = { UPCOMING: [event()] }, summaryBody = summary, logs = activity } = {}) {
  eventRequests = [];
  server.use(
    http.get(`${BASE}/organizations/${ORG}/analytics/dashboard`, () => HttpResponse.json({ success: true, data: { summary: summaryBody } })),
    http.get(`${BASE}/organizations/${ORG}/events`, ({ request }) => {
      const params = Object.fromEntries(new URL(request.url).searchParams);
      eventRequests.push(params);
      const list = eventsByStatus[params.status] ?? [];
      return HttpResponse.json({ success: true, data: list, pagination: { page: 1, limit: 4, total: list.length, totalPages: 1 } });
    }),
    http.get(`${BASE}/organizations/${ORG}/audit-logs/recent`, () => HttpResponse.json({ success: true, data: { logs } })),
    http.get(`${BASE}/me/events`, () => HttpResponse.json({ success: true, data: { events: [] } }))
  );
}

const renderManager = (role, user) =>
  renderAtOrgRoute(<ManagerDashboard />, {
    orgSlug: 'acme',
    memberships: [membership(role)],
    ...(user ? { user } : {}),
  });

describe('ManagerDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 24, 9, 5)); // 9:05 AM local
  });
  afterEach(() => vi.useRealTimers());

  describe('as an admin', () => {
    const user = { id: 'user-1', name: 'Riya Kapoor', email: 'riya@example.com' };

    it('greets by first name and offers exactly two header actions', async () => {
      serveDashboard();
      renderManager('SUPER_ADMIN', user);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good morning, Riya');
      expect(screen.getByText("Here's what's happening at Acme Corp today.")).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Create Event/ })).toHaveAttribute('href', '/org/acme/events/new');
      expect(screen.getByRole('link', { name: /View Calendar/ })).toHaveAttribute('href', '/org/acme/calendar');
    });

    it('shows four KPIs with honest deltas', async () => {
      serveDashboard();
      renderManager('SUPER_ADMIN', user);

      expect(await screen.findByText('148')).toBeInTheDocument();
      expect(screen.getByText('2 in the next 7 days')).toBeInTheDocument();
      expect(screen.getByText('-22% new sign-ups vs last month')).toBeInTheDocument();
      expect(screen.getByText('+133% vs last month')).toBeInTheDocument();
      expect(screen.getByText('2 drafts · 2 pending invites')).toBeInTheDocument();
    });

    it('shows a plain fact instead of a percentage when last month had none', async () => {
      serveDashboard({ summaryBody: { ...summary, newRegistrationsLastMonth: 0, eventsLastMonth: 0 } });
      renderManager('SUPER_ADMIN', user);

      expect(await screen.findByText('39 new this month')).toBeInTheDocument();
      expect(screen.queryByText(/vs last month/)).not.toBeInTheDocument();
    });

    it('lists all three quick actions and the recent activity in sentence form', async () => {
      serveDashboard();
      renderManager('SUPER_ADMIN', user);

      expect(await screen.findByRole('link', { name: /Publish a draft/ })).toHaveAttribute('href', '/org/acme/events?status=DRAFT');
      expect(screen.getByRole('link', { name: /Invite members/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View analytics/ })).toBeInTheDocument();

      const feed = (await screen.findByText('Recent activity')).closest('section');
      expect(await within(feed).findByText('Sneha Iyer')).toBeInTheDocument();
      expect(within(feed).getAllByRole('link', { name: 'Product Launch Webinar' })[0]).toHaveAttribute('href', '/org/acme/events/event-1');
      // The promotion row must not credit the person who freed the spot.
      expect(within(feed).queryByText('Kabir Rao')).not.toBeInTheDocument();
      expect(within(feed).getByText('A waitlisted attendee was moved into')).toBeInTheDocument();
    });

    it('sends "Publish a draft" to the drafts when there are some', async () => {
      serveDashboard();
      renderManager('SUPER_ADMIN', user);
      expect(await screen.findByRole('link', { name: /Publish a draft/ })).toHaveAttribute('href', '/org/acme/events?status=DRAFT');
      expect(screen.queryByRole('link', { name: /Create an event/ })).not.toBeInTheDocument();
    });

    it('goes straight to the create-event page when there are no drafts, not to an empty list', async () => {
      serveDashboard({ summaryBody: { ...summary, pendingActions: { total: 2, drafts: 0, pendingInvites: 2 } } });
      renderManager('SUPER_ADMIN', user);

      expect(await screen.findByRole('link', { name: /Create an event/ })).toHaveAttribute('href', '/org/acme/events/new');
      expect(screen.queryByRole('link', { name: /Publish a draft/ })).not.toBeInTheDocument();
    });

    it('does not flash "Publish a draft" while the summary is still loading', async () => {
      serveDashboard();
      renderManager('SUPER_ADMIN', user);
      expect(screen.queryByRole('link', { name: /Publish a draft|Create an event/ })).not.toBeInTheDocument();
      await screen.findByRole('link', { name: /Publish a draft/ });
    });

    it('falls back to the drafts list if the summary fails', async () => {
      serveDashboard();
      server.use(http.get(`${BASE}/organizations/${ORG}/analytics/dashboard`, () => HttpResponse.json({ success: false }, { status: 500 })));
      renderManager('SUPER_ADMIN', user);
      expect(await screen.findByRole('link', { name: /Publish a draft/ })).toHaveAttribute('href', '/org/acme/events?status=DRAFT');
    });

    it("does not scope the event lists to a person", async () => {
      serveDashboard();
      renderManager('ORG_ADMIN', user);
      await screen.findByText('Product Launch Webinar');
      expect(eventRequests.length).toBeGreaterThan(0);
      expect(eventRequests.every((params) => params.organizer === undefined)).toBe(true);
    });
  });

  describe('as an organizer', () => {
    const user = { id: 'user-7', name: 'Arjun Mehta', email: 'arjun@example.com' };
    const organizerSummary = { ...summary, pendingActions: { total: 1, drafts: 1, pendingInvites: null } };

    it("scopes every event list to the organizer's own events", async () => {
      serveDashboard({ summaryBody: organizerSummary });
      renderManager('ORGANIZER', user);
      await screen.findByText('Product Launch Webinar');
      expect(eventRequests.length).toBeGreaterThan(0);
      expect(eventRequests.every((params) => params.organizer === 'user-7')).toBe(true);
    });

    it('has no activity feed and no invite shortcut, and does not mention invites at all', async () => {
      serveDashboard({ summaryBody: organizerSummary });
      renderManager('ORGANIZER', user);

      expect(await screen.findByText('1 draft')).toBeInTheDocument();
      expect(screen.queryByText('Recent activity')).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Invite members/ })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Publish a draft/ })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /View analytics/ })).toBeInTheDocument();
    });
  });

  describe('the events tabs', () => {
    it('asks for the right status per tab, and explains an empty one', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      serveDashboard({ eventsByStatus: { UPCOMING: [event()], DRAFT: [], COMPLETED: [] } });
      renderManager('SUPER_ADMIN', { id: 'user-1', name: 'Riya Kapoor', email: 'r@example.com' });

      await screen.findByText('Product Launch Webinar');
      expect(eventRequests.some((params) => params.status === 'UPCOMING' && params.sort === 'startsAt_asc')).toBe(true);

      await user.click(screen.getByRole('tab', { name: 'DRAFTS' }));
      expect(await screen.findByText('No drafts waiting')).toBeInTheDocument();
      expect(eventRequests.some((params) => params.status === 'DRAFT')).toBe(true);

      await user.click(screen.getByRole('tab', { name: 'COMPLETED' }));
      expect(await screen.findByText('No completed events yet')).toBeInTheDocument();
      // Completed reads newest-first.
      await waitFor(() => expect(eventRequests.some((params) => params.status === 'COMPLETED' && params.sort === 'startsAt_desc')).toBe(true));
    });

    it('links "View all" to the events list filtered the same way', async () => {
      serveDashboard();
      renderManager('SUPER_ADMIN', { id: 'user-1', name: 'Riya Kapoor', email: 'r@example.com' });
      expect(await screen.findByRole('link', { name: 'View all' })).toHaveAttribute('href', '/org/acme/events?status=UPCOMING');
    });

    it('offers to create an event from an empty Upcoming tab', async () => {
      serveDashboard({ eventsByStatus: { UPCOMING: [] } });
      renderManager('SUPER_ADMIN', { id: 'user-1', name: 'Riya Kapoor', email: 'r@example.com' });
      expect(await screen.findByText('Nothing scheduled yet')).toBeInTheDocument();
      const empty = screen.getByText('Nothing scheduled yet').closest('div');
      expect(within(empty).getByRole('link', { name: /Create Event/ })).toBeInTheDocument();
    });
  });

  it('shows Live now only while an event is running', async () => {
    serveDashboard({ eventsByStatus: { UPCOMING: [], ONGOING: [event({ _id: 'live-1', title: 'All-Hands Town Hall', displayStatus: 'ONGOING' })] } });
    renderManager('SUPER_ADMIN', { id: 'user-1', name: 'Riya Kapoor', email: 'r@example.com' });
    const live = (await screen.findByText('Live now')).closest('section');
    expect(within(live).getByRole('link', { name: 'All-Hands Town Hall' })).toBeInTheDocument();
  });

  it('says so when the summary cannot be loaded, instead of showing zeros', async () => {
    serveDashboard();
    server.use(http.get(`${BASE}/organizations/${ORG}/analytics/dashboard`, () => HttpResponse.json({ success: false }, { status: 500 })));
    renderManager('SUPER_ADMIN', { id: 'user-1', name: 'Riya Kapoor', email: 'r@example.com' });
    expect(await screen.findByText(/Could not load your summary/)).toBeInTheDocument();
  });
});

describe('EmployeeDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 8, 24, 15, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('has the shared greeting, a single calendar action, and useful empty states', async () => {
    serveDashboard({ eventsByStatus: { REGISTRATION_OPEN: [] } });
    renderAtOrgRoute(<EmployeeDashboard />, {
      orgSlug: 'acme',
      memberships: [membership('EMPLOYEE')],
      user: { id: 'user-9', name: 'Sneha Iyer', email: 's@example.com' },
    });

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good afternoon, Sneha');
    expect(screen.getByRole('link', { name: /View Calendar/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Create Event/ })).not.toBeInTheDocument();
    expect(await screen.findByText('No events are open for registration')).toBeInTheDocument();
    expect(await screen.findByText("You haven't registered for anything yet")).toBeInTheDocument();
  });
});
