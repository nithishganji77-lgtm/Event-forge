import { describe, it, expect, vi } from 'vitest';
import { toast } from 'sonner';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { screen, waitFor, render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { server } from '../../../../tests/mocks/server.js';
import { createTestQueryClient } from '../../../../tests/test-utils.jsx';
import { RegisterButton } from './RegisterButton.jsx';

const BASE = 'http://localhost:4000/api/v1';

function renderButton(event) {
  const queryClient = createTestQueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <RegisterButton event={event} />
    </QueryClientProvider>
  );
  return { queryClient };
}

const baseEvent = {
  _id: 'event-1',
  displayStatus: 'REGISTRATION_OPEN',
  capacity: 10,
  registeredCount: 3,
  myRegistrationStatus: null,
};

// Table-driven over the branch matrix documented in RegisterButton.jsx's own comment: it always
// fires the same mutation regardless of the pre-click label, and the label/disabled-state is
// purely a read of server truth (myRegistrationStatus / displayStatus / capacity), never trusted
// client-side state.
describe('RegisterButton branch matrix', () => {
  it('shows REGISTERED + a Cancel action when the caller already holds a confirmed spot', () => {
    renderButton({ ...baseEvent, myRegistrationStatus: 'REGISTERED' });
    expect(screen.getByText('REGISTERED')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('shows ON WAITLIST + a Cancel action when the caller is waitlisted', () => {
    renderButton({ ...baseEvent, myRegistrationStatus: 'WAITLISTED' });
    expect(screen.getByText('ON WAITLIST')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('shows a disabled REGISTRATION CLOSED button whenever displayStatus is not open, regardless of capacity', () => {
    renderButton({ ...baseEvent, displayStatus: 'REGISTRATION_CLOSED', registeredCount: 0 });
    expect(screen.getByRole('button', { name: /registration closed/i })).toBeDisabled();
  });

  it('shows REGISTER when open and under capacity', () => {
    renderButton(baseEvent);
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    expect(screen.queryByText(/join waitlist/i)).not.toBeInTheDocument();
  });

  // Capacity-full is documented as an independent condition from displayStatus — displayStatus
  // stays REGISTRATION_OPEN even at capacity, and the button offers "join waitlist" instead of
  // "register" rather than closing registration outright.
  it('shows JOIN WAITLIST when open but at capacity', () => {
    renderButton({ ...baseEvent, registeredCount: 10 });
    expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument();
    expect(screen.queryByText(/registration closed/i)).not.toBeInTheDocument();
  });

  it('POSTs /events/:id/register and reflects the pending state when clicked', async () => {
    const user = userEvent.setup();
    let registerCalled = false;
    server.use(
      http.post(`${BASE}/events/event-1/register`, async () => {
        registerCalled = true;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return HttpResponse.json({ success: true, data: { registration: { status: 'REGISTERED' } } });
      })
    );
    renderButton(baseEvent);

    await user.click(screen.getByRole('button', { name: /register/i }));
    expect(await screen.findByText(/registering/i)).toBeInTheDocument();
    await waitFor(() => expect(registerCalled).toBe(true));
  });

  it('DELETEs /events/:id/register when Cancel is clicked on an active registration', async () => {
    const user = userEvent.setup();
    let cancelCalled = false;
    server.use(
      http.delete(`${BASE}/events/event-1/register`, () => {
        cancelCalled = true;
        return HttpResponse.json({ success: true, message: 'Registration cancelled' });
      })
    );
    renderButton({ ...baseEvent, myRegistrationStatus: 'REGISTERED' });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(cancelCalled).toBe(true));
  });
  // Registering used to fail with nothing on screen: a closed event, a lost connection, a 500.
  it('tells the person when registering fails, and why', async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toast, 'error').mockImplementation(() => {});
    server.use(
      http.post(`${BASE}/events/event-1/register`, () =>
        HttpResponse.json({ success: false, error: { message: 'Registration for this event is closed.' } }, { status: 409 })
      )
    );
    renderButton(baseEvent);

    await user.click(screen.getByRole('button', { name: /register/i }));
    await waitFor(() =>
      expect(toastSpy).toHaveBeenCalledWith('Could not register you for this event', { description: 'Registration for this event is closed.' })
    );
    toastSpy.mockRestore();
  });

  it('tells the person when cancelling a registration fails', async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toast, 'error').mockImplementation(() => {});
    server.use(http.delete(`${BASE}/events/event-1/register`, () => HttpResponse.error()));
    renderButton({ ...baseEvent, myRegistrationStatus: 'REGISTERED' });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(toastSpy).toHaveBeenCalled());
    expect(toastSpy.mock.calls[0][0]).toBe('Could not cancel your registration');
    expect(toastSpy.mock.calls[0][1].description).toMatch(/can't reach EventForge/i);
    toastSpy.mockRestore();
  });
});
