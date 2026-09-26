import { describe, it, expect } from 'vitest';
import { extractErrorMessage, getErrorInfo } from './errors.js';

// Plain objects shaped like an axios error, so this tests our reading of it, not axios.
const httpError = (status, body, headers = {}) => ({ response: { status, data: body, headers } });
const apiError = (status, message, details) => httpError(status, { success: false, error: { message, details } });

describe('getErrorInfo', () => {
  it('says the connection is the problem when the request never got an answer', () => {
    const info = getErrorInfo({ code: 'ERR_NETWORK', request: {} });
    expect(info).toMatchObject({ kind: 'network', retryable: true });
    expect(info.message).toMatch(/can't reach EventForge.*internet connection/i);
  });

  it('says it took too long on a timeout', () => {
    const info = getErrorInfo({ code: 'ECONNABORTED' });
    expect(info).toMatchObject({ kind: 'timeout', retryable: true });
    expect(info.message).toMatch(/took too long/i);
  });

  it("never shows the text of an error our own code threw", () => {
    const info = getErrorInfo(new TypeError("Cannot read properties of undefined (reading 'x')"));
    expect(info.message).toBeNull();
    expect(info.kind).toBe('unknown');
  });

  it("uses the server's sentence as it is", () => {
    const info = getErrorInfo(apiError(409, 'You are already registered for this event.'));
    expect(info).toMatchObject({ kind: 'conflict', status: 409, message: 'You are already registered for this event.', retryable: false });
  });

  it('collects one message per field from validation details', () => {
    const info = getErrorInfo(
      apiError(400, 'Event name is required; Map link must be a link', [
        { path: 'title', message: 'Event name is required' },
        { path: 'venue.mapUrl', message: 'Map link must be a link' },
        { path: 'title', message: 'a second problem with the same field' },
      ])
    );
    expect(info.kind).toBe('validation');
    expect(info.fieldErrors).toEqual({ title: 'Event name is required', 'venue.mapUrl': 'Map link must be a link' });
  });

  it('ignores details that are not a list of problems (the not-found route sends an object)', () => {
    const info = getErrorInfo(apiError(404, "We couldn't find what you were looking for.", { method: 'GET', url: '/x' }));
    expect(info.fieldErrors).toEqual({});
    expect(info.kind).toBe('not_found');
  });

  it('turns a rate limit into a wait time when the server says how long', () => {
    const info = getErrorInfo(httpError(429, { error: { message: 'Too many requests.' } }, { 'ratelimit-reset': '240' }));
    expect(info.kind).toBe('rate_limit');
    expect(info.message).toBe('Too many requests in a short time. Please wait about 4 minutes and try again.');
  });

  it('keeps the server sentence for a rate limit with no reset header', () => {
    const info = getErrorInfo(apiError(429, 'Please wait a few minutes.'));
    expect(info.message).toBe('Please wait a few minutes.');
  });

  it("writes its own sentence when a proxy's HTML error page is all there is", () => {
    const info = getErrorInfo(httpError(502, '<html><body>Bad Gateway</body></html>'));
    expect(info).toMatchObject({ kind: 'server', retryable: true });
    expect(info.message).toBe('EventForge is temporarily unavailable. Please try again in a minute.');
    const timeout = getErrorInfo(httpError(504, ''));
    expect(timeout.message).toMatch(/took too long to respond/i);
  });

  it('does not offer a retry for an answer that would be the same again', () => {
    for (const status of [400, 401, 403, 404, 409]) {
      expect(getErrorInfo(apiError(status, 'x')).retryable).toBe(false);
    }
    expect(getErrorInfo(apiError(500, 'x')).retryable).toBe(true);
  });

  it('falls back to a status sentence when the body has no message', () => {
    expect(getErrorInfo(httpError(403, {})).message).toMatch(/permission/i);
    expect(getErrorInfo(httpError(404, undefined)).message).toMatch(/couldn't find/i);
  });
});

describe('extractErrorMessage', () => {
  it('returns the reason, and only uses the fallback when there is none', () => {
    expect(extractErrorMessage({ code: 'ERR_NETWORK', request: {} }, 'Could not load events')).toMatch(/can't reach EventForge/i);
    expect(extractErrorMessage(apiError(400, 'Event name is required'), 'Could not save')).toBe('Event name is required');
    expect(extractErrorMessage(new Error('boom'), 'We could not save that.')).toBe('We could not save that.');
    expect(extractErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
  });
});
