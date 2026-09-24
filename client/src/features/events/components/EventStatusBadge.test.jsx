import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventStatusBadge } from './EventStatusBadge.jsx';

const NOW = Date.UTC(2026, 8, 24, 10, 0, 0); // minute-aligned, so useNow's snapshot equals it

describe('EventStatusBadge', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('shows LIVE for an ongoing event', () => {
    render(<EventStatusBadge event={{ displayStatus: 'ONGOING' }} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('shows a countdown for an event starting within a day that has a start time', () => {
    const event = {
      displayStatus: 'REGISTRATION_OPEN',
      startTime: '12:15',
      startsAt: new Date(NOW + (2 * 60 + 15) * 60 * 1000).toISOString(),
    };
    render(<EventStatusBadge event={event} />);
    expect(screen.getByText('Starts in 2H 15M')).toBeInTheDocument();
  });

  it('shows Upcoming, not a countdown, when the event has no start time', () => {
    const event = {
      displayStatus: 'REGISTRATION_OPEN',
      startTime: '',
      startsAt: new Date(NOW + 3 * 60 * 60 * 1000).toISOString(),
    };
    render(<EventStatusBadge event={event} />);
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('still accepts a bare displayStatus for callers that only have that', () => {
    render(<EventStatusBadge status="CANCELLED" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('pairs every status with an icon, never color alone', () => {
    const { container } = render(<EventStatusBadge event={{ displayStatus: 'DRAFT' }} />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});
