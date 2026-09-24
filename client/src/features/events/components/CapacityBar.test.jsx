import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CapacityBar } from './CapacityBar.jsx';

describe('CapacityBar', () => {
  it('exposes registrations as a progressbar with a readable value', () => {
    render(<CapacityBar registered={3} capacity={10} />);
    const bar = screen.getByRole('progressbar', { name: 'Registrations' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuetext', '3 of 10 registered');
    expect(screen.getByText('3 / 10')).toBeInTheDocument();
  });

  it('says Full at capacity, and mentions the waitlist', () => {
    render(<CapacityBar registered={10} capacity={10} waitlisted={4} />);
    expect(screen.getByText(/Full/)).toBeInTheDocument();
    expect(screen.getByText(/4 waitlisted/)).toBeInTheDocument();
  });

  it('caps the bar when registrations somehow exceed capacity', () => {
    render(<CapacityBar registered={12} capacity={10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');
  });

  it('does not divide by zero for a capacity of 0', () => {
    render(<CapacityBar registered={0} capacity={0} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});
