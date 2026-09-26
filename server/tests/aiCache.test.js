import { cacheKey, createCache, createQuotaBucket } from '../src/services/ai/cache.js';

describe('cache', () => {
  it('returns what was stored, until it expires', () => {
    let now = 1000;
    const cache = createCache({ max: 10, ttlMs: 500, now: () => now });
    cache.set('a', { v: 1 });
    expect(cache.get('a')).toEqual({ v: 1 });
    now += 501;
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('evicts the least recently USED entry, not the oldest one written', () => {
    const cache = createCache({ max: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // a is now the most recent
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  it('is off when the time limit is zero', () => {
    const cache = createCache({ ttlMs: 0 });
    cache.set('a', 1);
    expect(cache.get('a')).toBeUndefined();
  });

  it('does not treat case or spacing as a different request', () => {
    const a = cacheKey('draft', { prompt: 'Plan  a Hackathon in Pune', category: 'Workshop' });
    const b = cacheKey('draft', { prompt: 'plan a hackathon in pune ', category: 'workshop' });
    expect(a).toBe(b);
  });

  it('does treat a different task, or different words, as a different request', () => {
    expect(cacheKey('draft', { prompt: 'x' })).not.toBe(cacheKey('concepts', { prompt: 'x' }));
    expect(cacheKey('draft', { prompt: 'x' })).not.toBe(cacheKey('draft', { prompt: 'y' }));
  });
});

describe('shared quota bucket', () => {
  it('lets through the allowed number in a minute, then says how long to wait', () => {
    let now = 0;
    const bucket = createQuotaBucket({ perMinute: 3, now: () => now });
    expect([1, 2, 3].map(() => bucket.tryAcquire().ok)).toEqual([true, true, true]);
    now = 20_000;
    expect(bucket.tryAcquire()).toEqual({ ok: false, retryAfterSeconds: 40 });
  });

  it('frees a slot as the window slides on', () => {
    let now = 0;
    const bucket = createQuotaBucket({ perMinute: 1, now: () => now });
    expect(bucket.tryAcquire().ok).toBe(true);
    now = 30_000;
    expect(bucket.tryAcquire().ok).toBe(false);
    now = 60_001;
    expect(bucket.tryAcquire().ok).toBe(true);
  });
});
