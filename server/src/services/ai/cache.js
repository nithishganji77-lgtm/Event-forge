import { createHash } from 'node:crypto';

// Least-recently-used cache with a time limit, in memory. Enough for one server process (each
// process would keep its own): an identical request within the hour costs no AI quota. It is safe
// to share across organizations because no organization data is ever put in a prompt.
export function createCache({ max = 200, ttlMs = 3_600_000, now = Date.now } = {}) {
  const entries = new Map(); // insertion order == recency order

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      entries.delete(key); // re-insert to mark as most recent
      entries.set(key, entry);
      return entry.value;
    },
    set(key, value) {
      if (ttlMs <= 0) return; // AI_CACHE_TTL_SECONDS=0 turns caching off
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + ttlMs });
      while (entries.size > max) entries.delete(entries.keys().next().value);
    },
    get size() {
      return entries.size;
    },
    clear() {
      entries.clear();
    },
  };
}

// Same request -> same key: whitespace and letter case in free text don't make a new request.
export function cacheKey(kind, params) {
  const normalized = JSON.stringify(params, (_key, value) =>
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().toLowerCase() : value
  );
  return createHash('sha256').update(`${kind}\n${normalized}`).digest('hex');
}

// A sliding one-minute window shared by every user. Google's free-tier quota is per project, so the
// per-user limiter alone cannot stop a few busy users from exhausting it.
export function createQuotaBucket({ perMinute, now = Date.now } = {}) {
  let stamps = [];

  return {
    tryAcquire() {
      const t = now();
      stamps = stamps.filter((stamp) => t - stamp < 60_000);
      if (stamps.length >= perMinute) {
        return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((stamps[0] + 60_000 - t) / 1000)) };
      }
      stamps.push(t);
      return { ok: true, retryAfterSeconds: 0 };
    },
    reset() {
      stamps = [];
    },
  };
}
