import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar.jsx';

describe('ProgressBar', () => {
  it('is a progressbar with a name and a spoken value', () => {
    render(<ProgressBar value={3} max={10} label="Registration" valueText="3 of 10 registered" />);
    const bar = screen.getByRole('progressbar', { name: 'Registration' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
    expect(bar).toHaveAttribute('aria-valuenow', '3');
    expect(bar).toHaveAttribute('aria-valuetext', '3 of 10 registered');
    expect(bar.firstChild).toHaveStyle({ width: '30%' });
  });

  it('never fills past 100% or reports more than the maximum', () => {
    render(<ProgressBar value={15} max={10} label="Over" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '10');
    expect(bar.firstChild).toHaveStyle({ width: '100%' });
  });

  it('is empty rather than NaN when there is no maximum', () => {
    render(<ProgressBar value={0} max={0} label="None" />);
    expect(screen.getByRole('progressbar').firstChild).toHaveStyle({ width: '0%' });
  });
});
