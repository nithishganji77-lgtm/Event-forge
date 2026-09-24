import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarDays } from 'lucide-react';
import { StatTile, formatRate } from './StatTile.jsx';

describe('StatTile', () => {
  it('renders the label, value and hint (the analytics pages pass nothing else)', () => {
    render(<StatTile label="Total events" value={12} hint="all time" />);
    expect(screen.getByText('Total events')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('all time')).toBeInTheDocument();
  });

  it('shows a trend as an arrow plus words, never colour alone', () => {
    const { container } = render(
      <StatTile label="Attendees" value="1,248" trend={{ direction: 'up', text: '+18% new sign-ups vs last month' }} />
    );
    expect(screen.getByText('+18% new sign-ups vs last month')).toBeInTheDocument();
    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders an optional decorative icon without changing the accessible content', () => {
    const { container } = render(<StatTile label="Events" value={3} icon={CalendarDays} />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('falls back to a flat trend icon for an unknown direction', () => {
    const { container } = render(<StatTile label="X" value={1} trend={{ direction: 'sideways', text: 'no change' }} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('no change')).toBeInTheDocument();
  });

  it('is more compact on request', () => {
    const { container, rerender } = render(<StatTile label="X" value={1} />);
    expect(container.firstChild.className).toContain('p-5');
    rerender(<StatTile label="X" value={1} compact />);
    expect(container.firstChild.className).toContain('p-4');
  });
});

describe('formatRate', () => {
  it('renders null/undefined as a dash instead of a misleading 0%', () => {
    expect(formatRate(null)).toBe('—');
    expect(formatRate(undefined)).toBe('—');
    expect(formatRate(0.456)).toBe('46%');
  });
});
