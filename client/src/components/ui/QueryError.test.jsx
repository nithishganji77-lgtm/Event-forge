import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryError } from './QueryError.jsx';

const httpError = (status, message) => ({ response: { status, data: { error: { message } }, headers: {} } });
const renderError = (props) => render(<MemoryRouter><QueryError title="We couldn't load your events" {...props} /></MemoryRouter>);

describe('QueryError', () => {
  it('says what was being loaded and why it failed, as an alert', () => {
    renderError({ error: httpError(500, 'Something went wrong on our side. Please try again in a moment.') });
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load your events");
    expect(screen.getByText('Something went wrong on our side. Please try again in a moment.')).toBeInTheDocument();
  });

  it('offers Try again when trying again could help, and it calls onRetry', async () => {
    const onRetry = vi.fn();
    renderError({ error: { code: 'ERR_NETWORK', request: {} }, onRetry });
    expect(screen.getByText(/can't reach EventForge/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('offers no retry for an answer that would be the same again', () => {
    renderError({ error: httpError(403, "You don't have permission to do that."), onRetry: vi.fn() });
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('offers a way out instead, when given one', () => {
    renderError({ error: httpError(404, "We couldn't find what you were looking for."), backTo: { to: '/org/acme/events', label: 'Back to events' } });
    expect(screen.getByRole('link', { name: 'Back to events' })).toHaveAttribute('href', '/org/acme/events');
  });

  it('never leaves the reason blank', () => {
    renderError({ error: new Error('boom') });
    expect(screen.getByText('Please try again in a moment.')).toBeInTheDocument();
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
  });
});
