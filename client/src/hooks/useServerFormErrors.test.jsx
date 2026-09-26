import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useServerFormErrors } from './useServerFormErrors.js';

const FIELDS = ['name', 'email'];
const validation = (details, message = 'x') => ({ response: { status: 400, data: { error: { message, details } }, headers: {} } });

function setup() {
  const setError = vi.fn();
  const { result } = renderHook(() => useServerFormErrors(setError, FIELDS));
  return { setError, result };
}

describe('useServerFormErrors', () => {
  it('puts each problem beside its field and shows no banner that would repeat them', () => {
    const { setError, result } = setup();
    act(() => result.current.onError(validation([{ path: 'email', message: 'An account with this email already exists.' }])));
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'An account with this email already exists.' });
    expect(result.current.alertMessage).toBeNull();
  });

  it('keeps a banner when a problem is about a field this form does not have', () => {
    const { setError, result } = setup();
    act(() =>
      result.current.onError(
        validation(
          [{ path: 'email', message: 'Enter a valid email address' }, { path: 'organizers', message: 'Organizers must be active members.' }],
          'Enter a valid email address; Organizers must be active members.'
        )
      )
    );
    expect(setError).toHaveBeenCalledTimes(1);
    expect(result.current.alertMessage).toMatch(/Organizers must be active members/);
  });

  it('shows a banner for anything that is not about a field: a dropped connection, a server error', () => {
    const { setError, result } = setup();
    act(() => result.current.onError({ code: 'ERR_NETWORK', request: {} }));
    expect(setError).not.toHaveBeenCalled();
    expect(result.current.alertMessage).toMatch(/can't reach EventForge/i);
  });

  it('never leaves an unexplained failure silent', () => {
    const { result } = setup();
    act(() => result.current.onError(new Error('internal')));
    expect(result.current.alertMessage).toBe('Something went wrong. Please try again.');
  });

  it('clears the banner for the next attempt', () => {
    const { result } = setup();
    act(() => result.current.onError({ code: 'ERR_NETWORK', request: {} }));
    act(() => result.current.clear());
    expect(result.current.alertMessage).toBeNull();
  });
});
