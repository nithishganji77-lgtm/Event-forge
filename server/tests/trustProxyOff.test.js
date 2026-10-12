import app from '../src/app.js';

// Default (TRUST_PROXY unset = 0): nothing in front of the app, as in local development.
// What req.ip resolves to, read through Express's own req.ip getter on a request that reached the
// app straight from a client at 10.0.0.1 claiming to be someone else in X-Forwarded-For.
const clientIp = (forwardedFor) => {
  const conn = { remoteAddress: '10.0.0.1' };
  return Object.create(app.request, {
    headers: { value: { 'x-forwarded-for': forwardedFor } },
    socket: { value: conn },
    connection: { value: conn },
  }).ip;
};

describe('with no proxy configured (TRUST_PROXY=0)', () => {
  it('ignores X-Forwarded-For entirely, so a client cannot claim to be someone else', () => {
    expect(clientIp('203.0.113.7')).toBe('10.0.0.1');
  });
});
