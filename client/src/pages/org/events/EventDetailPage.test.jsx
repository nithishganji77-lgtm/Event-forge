import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { server } from '../../../../tests/mocks/server.js';
import { createTestQueryClient } from '../../../../tests/test-utils.jsx';
import { QUERY_KEYS } from '../../../utils/constants.js';
import { EventDetailPage } from './EventDetailPage.jsx';

const BASE = 'http://localhost:4000/api/v1';

const membership = (role) => ({
  organizationId: 'org-1',
  organizationSlug: 'acme',
  organizationName: 'Acme Corp',
  role,
  permissions: [],
});

const baseEvent = {
  _id: 'event-1',
  organization: 'org-1',
  title: 'Sreeman Gadi Pelli',
  description: 'Join us for a two day celebration.',
  category: 'Social',
  status: 'PUBLISHED',
  displayStatus: 'ONGOING',
  timezone: 'Asia/Kolkata',
  startDate: '2026-09-24T00:00:00.000Z',
  endDate: '2026-09-25T00:00:00.000Z',
  startTime: '10:00',
  endTime: '18:00',
  startsAt: '2026-09-24T04:30:00.000Z',
  venue: { name: 'iBlock', address: 'Hyderabad, Telangana', room: '', mapUrl: '' },
  capacity: 200,
  registeredCount: 1,
  waitlistedCount: 0,
  myRegistrationStatus: null,
  registrationDeadline: null,
  createdBy: 'user-1',
  organizers: [],
  coverImage: '',
  people: [{ _id: 'user-1', name: 'Nithish Ganji', email: 'nithish@example.com', role: 'CREATOR' }],
};

function serveEvent(overrides = {}, { registrations = [] } = {}) {
  const requests = [];
  server.use(
    http.get(`${BASE}/events/event-1`, () => HttpResponse.json({ success: true, data: { event: { ...baseEvent, ...overrides } } })),
    http.get(`${BASE}/events/event-1/registrations`, ({ request }) => {
      requests.push(Object.fromEntries(new URL(request.url).searchParams));
      return HttpResponse.json({
        success: true,
        data: registrations,
        pagination: { page: 1, limit: 20, total: registrations.length, totalPages: 1 },
      });
    }),
    http.get(`${BASE}/events/event-1/analytics`, () =>
      HttpResponse.json({
        success: true,
        data: { analytics: { registeredCount: 1, waitlistedCount: 0, capacityUtilization: 0.005, cancellationRate: 0, attendanceRate: null, registrationTimeline: [] } },
      })
    )
  );
  return requests;
}

function renderPage({ role = 'SUPER_ADMIN', userId = 'user-1', query = '' } = {}) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(QUERY_KEYS.CURRENT_USER, {
    user: { id: userId, name: 'Test User', email: 'test@example.com' },
    memberships: [membership(role)],
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/org/acme/events/event-1${query}`]}>
        <Routes>
          <Route path="/org/:orgSlug/events/:eventId" element={<EventDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('EventDetailPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-24T06:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  describe('as the person running the event', () => {
    it('leads with a hero: breadcrumb, title, live status, when and where', async () => {
      serveEvent();
      renderPage();

      expect(await screen.findByRole('heading', { level: 1, name: 'Sreeman Gadi Pelli' })).toBeInTheDocument();
      expect(within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/org/acme/events');
      expect(screen.getByText('Live')).toBeInTheDocument();
      expect(screen.getByText(/Thu, Sep 24, 2026 – Fri, Sep 25, 2026 · 10:00 AM/)).toBeInTheDocument();
    });

    it('shows registration as a figure and a bar, the duration and the venue', async () => {
      serveEvent();
      renderPage();

      await screen.findByText('1 / 200');
      expect(screen.getByRole('progressbar', { name: 'Registration' })).toHaveAttribute('aria-valuetext', '1 of 200 registered');
      expect(screen.getByText('0.5% of capacity')).toBeInTheDocument();
      expect(screen.getByText('2 days')).toBeInTheDocument();
      // The venue name also appears in the hero and the details panel; the stat tile is the third.
      expect(screen.getAllByText('iBlock').length).toBeGreaterThanOrEqual(2);
    });

    it('offers Edit and Manage attendees as buttons, and keeps destructive actions in the menu', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      serveEvent();
      renderPage();

      expect(await screen.findByRole('link', { name: 'Edit event' })).toHaveAttribute('href', '/org/acme/events/event-1/edit');
      expect(screen.getByRole('link', { name: /Manage attendees/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel event' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /More actions/ }));
      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Duplicate', 'Copy link', 'Cancel event', 'Delete event']);
    });

    it('has all five tabs, and about shows the description beside the event details', async () => {
      serveEvent({ registrationDeadline: '2026-09-23T00:00:00.000Z', displayStatus: 'REGISTRATION_OPEN' });
      renderPage();

      await screen.findByText('Join us for a two day celebration.');
      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['ABOUT', 'VENUE', 'ORGANIZERS', 'ATTENDEES', 'ANALYTICS']);
      const details = screen.getByText('Event details').closest('section');
      expect(within(details).getByText('10:00 AM – 6:00 PM')).toBeInTheDocument();
      expect(within(details).getByText('200 attendees')).toBeInTheDocument();
      expect(within(details).getByText('Open')).toBeInTheDocument();
      expect(within(details).getByText(/^Closes .*23/)).toBeInTheDocument();
    });

    it('offers Publish for a draft and no register control', async () => {
      serveEvent({ status: 'DRAFT', displayStatus: 'DRAFT' });
      renderPage();

      expect(await screen.findByRole('button', { name: 'Publish' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /register/i })).not.toBeInTheDocument();
      expect(screen.getByText('Not open yet')).toBeInTheDocument();
    });

    it('does not show a dead "registration closed" button on a finished event they run', async () => {
      serveEvent({ displayStatus: 'COMPLETED' });
      renderPage();
      await screen.findByRole('heading', { level: 1 });
      expect(screen.queryByRole('button', { name: /registration closed/i })).not.toBeInTheDocument();
    });
  });

  describe('tabs', () => {
    it('opens straight to the tab in the URL', async () => {
      serveEvent();
      renderPage({ query: '?tab=organizers' });
      expect(await screen.findByText('Nithish Ganji')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'ORGANIZERS' })).toHaveAttribute('aria-selected', 'true');
    });

    it('falls back to About for an unknown tab, or one the person cannot see', async () => {
      serveEvent();
      renderPage({ role: 'EMPLOYEE', userId: 'user-9', query: '?tab=attendees' });
      await screen.findByRole('heading', { level: 1 });
      expect(screen.getByRole('tab', { name: 'ABOUT' })).toHaveAttribute('aria-selected', 'true');
    });

    it('presents organizers as people, with a role and a mail link', async () => {
      serveEvent({
        organizers: ['user-2'],
        people: [
          { _id: 'user-1', name: 'Nithish Ganji', email: 'nithish@example.com', role: 'CREATOR' },
          { _id: 'user-2', name: 'Arjun Mehta', email: 'arjun@example.com', role: 'ORGANIZER' },
        ],
      });
      renderPage({ query: '?tab=organizers' });

      const arjun = (await screen.findByText('Arjun Mehta')).closest('li');
      expect(within(arjun).getByText('Organizer')).toBeInTheDocument();
      expect(within(arjun).getByRole('link', { name: 'arjun@example.com' })).toHaveAttribute('href', 'mailto:arjun@example.com');
      expect(within(screen.getByText('Nithish Ganji').closest('li')).getByText('Creator')).toBeInTheDocument();
    });
  });

  describe('venue', () => {
    it('links to directions for the venue', async () => {
      serveEvent();
      renderPage({ query: '?tab=venue' });

      const link = await screen.findByRole('link', { name: /Get directions/ });
      expect(link.getAttribute('href')).toBe('https://www.google.com/maps/search/?api=1&query=iBlock%2C%20Hyderabad%2C%20Telangana');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    });

    it('never turns a javascript: map link into a link, even one saved before the server refused them', async () => {
      serveEvent({ venue: { name: 'iBlock', address: '', room: '', mapUrl: 'javascript:alert(document.cookie)' } });
      renderPage({ query: '?tab=venue' });

      await screen.findByRole('link', { name: /Get directions/ });
      expect(screen.queryByRole('link', { name: /Open map link/ })).not.toBeInTheDocument();
      for (const link of screen.getAllByRole('link')) {
        expect(link.getAttribute('href') ?? '').not.toMatch(/^javascript:/i);
      }
    });

    it('offers an https map link when there is one', async () => {
      serveEvent({ venue: { name: 'iBlock', address: '', room: '', mapUrl: 'https://maps.example.com/iblock' } });
      renderPage({ query: '?tab=venue' });
      expect(await screen.findByRole('link', { name: /Open map link/ })).toHaveAttribute('href', 'https://maps.example.com/iblock');
    });

    it('explains an event with no venue, and lets a manager add one', async () => {
      serveEvent({ venue: { name: '', address: '', room: '', mapUrl: '' } });
      renderPage({ query: '?tab=venue' });
      expect(await screen.findByText('No venue yet')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Add a venue' })).toHaveAttribute('href', '/org/acme/events/event-1/edit');
    });
  });

  describe('attendees', () => {
    const registrations = [
      { _id: 'r1', status: 'REGISTERED', attendanceStatus: 'PENDING', registeredAt: '2026-09-20T10:00:00.000Z', user: { name: 'Rahul Verma', email: 'rahul@example.com' } },
      { _id: 'r2', status: 'WAITLISTED', attendanceStatus: 'PENDING', registeredAt: '2026-09-21T10:00:00.000Z', user: { name: 'Priya Nair', email: 'priya@example.com' } },
    ];

    it('shows how full the event is and a person / status table with words, not colour', async () => {
      serveEvent({ waitlistedCount: 1 }, { registrations });
      renderPage({ query: '?tab=attendees' });

      const table = await screen.findByRole('table');
      expect(within(table).getByText('Rahul Verma')).toBeInTheDocument();
      expect(within(table).getByText('rahul@example.com')).toBeInTheDocument();
      expect(within(table).getByText('Confirmed')).toBeInTheDocument();
      expect(within(table).getByText('Waitlisted')).toBeInTheDocument();
      // The stats row above the tabs and the attendee header both say it.
      expect(screen.getAllByText('0.5% of capacity · 1 waitlisted')).toHaveLength(2);
    });

    it('sends what is typed as a search, and explains an empty result', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const requests = serveEvent({}, { registrations });
      renderPage({ query: '?tab=attendees' });
      await screen.findByRole('table');

      server.use(
        http.get(`${BASE}/events/event-1/registrations`, ({ request }) => {
          requests.push(Object.fromEntries(new URL(request.url).searchParams));
          return HttpResponse.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } });
        })
      );
      await user.type(screen.getByRole('searchbox', { name: 'Search attendees…' }), 'zzz');
      vi.advanceTimersByTime(500);

      expect(await screen.findByText('No attendees match')).toBeInTheDocument();
      expect(requests.some((params) => params.search === 'zzz')).toBe(true);
    });

    it('has no Export or Add attendee, since nothing behind them exists', async () => {
      serveEvent({}, { registrations });
      renderPage({ query: '?tab=attendees' });
      await screen.findByRole('table');
      expect(screen.queryByRole('button', { name: /export|add attendee/i })).not.toBeInTheDocument();
    });
  });

  describe('analytics', () => {
    it('keeps the chart frame with an explanation when nothing has been registered yet', async () => {
      serveEvent();
      renderPage({ query: '?tab=analytics' });

      expect(await screen.findByText('Registrations Over Time')).toBeInTheDocument();
      expect(screen.getByText(/No registrations yet/)).toBeInTheDocument();
      expect(screen.getByText('Not enough data yet')).toBeInTheDocument();
    });
  });

  describe('as an employee', () => {
    it('sees their registration state, not management, and can cancel', async () => {
      serveEvent({ displayStatus: 'REGISTRATION_OPEN', myRegistrationStatus: 'REGISTERED' });
      renderPage({ role: 'EMPLOYEE', userId: 'user-9' });

      expect(await screen.findByText("You're registered")).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel registration' })).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Edit event' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Manage attendees/ })).not.toBeInTheDocument();
      expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['ABOUT', 'VENUE', 'ORGANIZERS']);
    });

    it('is offered Register on an open event, and only Copy link in the menu', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      serveEvent({ displayStatus: 'REGISTRATION_OPEN' });
      renderPage({ role: 'EMPLOYEE', userId: 'user-9' });

      expect(await screen.findByRole('button', { name: /^register/i })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /More actions/ }));
      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Copy link']);
    });
  });

  it("does not give an organizer another organizer's management tools", async () => {
    serveEvent({ displayStatus: 'REGISTRATION_OPEN', createdBy: 'someone-else' });
    renderPage({ role: 'ORGANIZER', userId: 'user-7' });

    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: 'Edit event' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'ATTENDEES' })).not.toBeInTheDocument();
  });

  it('says so when the event cannot be loaded', async () => {
    server.use(http.get(`${BASE}/events/event-1`, () => HttpResponse.json({ success: false, error: { message: 'Event not found' } }, { status: 404 })));
    renderPage();
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/not found|could not load/i));
  });
});
