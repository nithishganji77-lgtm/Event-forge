import { describe, it, expect, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner.jsx';

function setOnline(value) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
  act(() => window.dispatchEvent(new Event(value ? 'online' : 'offline')));
}

describe('OfflineBanner', () => {
  afterEach(() => setOnline(true));

  it('says nothing while the connection is fine', () => {
    render(<OfflineBanner />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it("explains a lost connection as it happens, and goes away when it comes back", () => {
    render(<OfflineBanner />);
    setOnline(false);
    expect(screen.getByRole('status')).toHaveTextContent("You're offline");
    setOnline(true);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
