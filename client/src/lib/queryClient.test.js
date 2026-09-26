import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MutationObserver } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryClient, shouldRetryQuery } from './queryClient.js';

const httpError = (status, message) => ({ response: { status, data: { error: { message } }, headers: {} } });

describe('mutation error toasts', () => {
  beforeEach(() => vi.restoreAllMocks());

  async function runFailing(meta, error) {
    const observer = new MutationObserver(queryClient, { mutationFn: () => Promise.reject(error), meta });
    await observer.mutate().catch(() => {});
  }

  it('shows what failed and why for a mutation that opts in', async () => {
    const spy = vi.spyOn(toast, 'error').mockImplementation(() => {});
    await runFailing({ errorToast: 'Could not register you for this event' }, httpError(409, 'Registration for this event is closed.'));
    expect(spy).toHaveBeenCalledWith('Could not register you for this event', { description: 'Registration for this event is closed.' });
  });

  it('says the connection is down instead of "something went wrong"', async () => {
    const spy = vi.spyOn(toast, 'error').mockImplementation(() => {});
    await runFailing({ errorToast: 'Could not publish this event' }, { code: 'ERR_NETWORK', request: {} });
    expect(spy.mock.calls[0][1].description).toMatch(/can't reach EventForge/i);
  });

  it('stays quiet for a mutation whose form or dialog already shows the error', async () => {
    const spy = vi.spyOn(toast, 'error').mockImplementation(() => {});
    await runFailing(undefined, httpError(400, 'Event name is required'));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('query retry', () => {
  it('does not retry an answer that will not change', () => {
    for (const status of [400, 401, 403, 404, 409]) expect(shouldRetryQuery(0, httpError(status, 'x'))).toBe(false);
  });

  it('retries a server error or a dropped connection once', () => {
    expect(shouldRetryQuery(0, httpError(500, 'x'))).toBe(true);
    expect(shouldRetryQuery(0, { code: 'ERR_NETWORK', request: {} })).toBe(true);
    expect(shouldRetryQuery(1, httpError(500, 'x'))).toBe(false);
  });
  it("sends requests even when the browser says it is offline, so they fail into a message instead of pausing on a blank page", () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries.networkMode).toBe('always');
    expect(defaults.mutations.networkMode).toBe('always');
  });
});
