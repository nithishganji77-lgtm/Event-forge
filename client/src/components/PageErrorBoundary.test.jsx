import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageErrorBoundary } from './PageErrorBoundary.jsx';
import { ErrorPanel, isChunkLoadError } from './ErrorPanel.jsx';

function Boom({ message = 'kaboom: internal detail' }) {
  throw new Error(message);
}

describe('PageErrorBoundary', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  const renderBoundary = (child, resetKey = '/a') =>
    render(<MemoryRouter><PageErrorBoundary resetKey={resetKey} homeTo="/org/acme/dashboard">{child}</PageErrorBoundary></MemoryRouter>);

  it('shows a recovery panel with a reload and a way home instead of a blank or broken page', () => {
    renderBoundary(<Boom />);
    expect(screen.getByRole('heading', { level: 1, name: 'This page ran into a problem' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toHaveAttribute('href', '/org/acme/dashboard');
  });

  it("never shows the error's own text to the person", () => {
    renderBoundary(<Boom />);
    expect(screen.queryByText(/kaboom/)).not.toBeInTheDocument();
  });

  it('says the app was updated when a lazy chunk failed to load, which a reload fixes', () => {
    renderBoundary(<Boom message="Failed to fetch dynamically imported module: /assets/Page-abc.js" />);
    expect(screen.getByRole('heading', { level: 1, name: 'EventForge has been updated' })).toBeInTheDocument();
    expect(screen.getByText(/reload the page to continue/i)).toBeInTheDocument();
  });

  it('clears itself when the route changes, so navigating away needs no reload', () => {
    const { rerender } = renderBoundary(<Boom />, '/a');
    expect(screen.getByText('This page ran into a problem')).toBeInTheDocument();
    rerender(<MemoryRouter><PageErrorBoundary resetKey="/b"><p>Another page</p></PageErrorBoundary></MemoryRouter>);
    expect(screen.getByText('Another page')).toBeInTheDocument();
  });

  it('renders its children when nothing is wrong', () => {
    renderBoundary(<p>All fine</p>);
    expect(screen.getByText('All fine')).toBeInTheDocument();
  });

  it('reloads the page when asked', async () => {
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { value: { ...window.location, reload }, writable: true });
    render(<MemoryRouter><ErrorPanel error={new Error('x')} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /reload page/i }));
    expect(reload).toHaveBeenCalled();
  });
});

describe('isChunkLoadError', () => {
  it.each([
    ['Failed to fetch dynamically imported module: http://x/a.js', true],
    ['Importing a module script failed.', true],
    ['error loading dynamically imported module', true],
    ["Cannot read properties of undefined (reading 'map')", false],
    [undefined, false],
  ])('%s -> %s', (message, expected) => {
    expect(isChunkLoadError(message === undefined ? undefined : { message })).toBe(expected);
  });
});
