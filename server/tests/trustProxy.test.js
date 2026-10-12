// Config is parsed once per test file, so this file runs with one proxy in front, as on Render.
process.env.TRUST_PROXY = '1';
const { default: app } = await import('../src/app.js');

// What req.ip resolves to, read through Express's own req.ip getter on a request that reached the
// app from 10.0.0.1 (the proxy) carrying the given X-Forwarded-For.
const clientIp = (forwardedFor) => {
  const conn = { remoteAddress: '10.0.0.1' };
  return Object.create(app.request, {
    headers: { value: { 'x-forwarded-for': forwardedFor } },
    socket: { value: conn },
    connection: { value: conn },
  }).ip;
};

describe('behind one proxy (TRUST_PROXY=1)', () => {
  it('uses the real client the proxy forwarded, not the proxy, so rate limits are per person', () => {
    expect(clientIp('203.0.113.7')).toBe('203.0.113.7');
  });

  it('ignores an address the client forged earlier in X-Forwarded-For', () => {
    // The proxy appends the address it actually saw; anything before that came from the client.
    expect(clientIp('6.6.6.6, 203.0.113.7')).toBe('203.0.113.7');
  });
});
