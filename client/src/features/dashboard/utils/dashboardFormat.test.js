import { describe, it, expect } from 'vitest';
import { formatDelta, formatPendingHint } from './dashboardFormat.js';

describe('formatDelta', () => {
  it('reports growth and decline with a sign, a percentage and what changed', () => {
    expect(formatDelta(12, 10, { noun: 'new sign-ups' })).toEqual({ direction: 'up', text: '+20% new sign-ups vs last month' });
    expect(formatDelta(7, 10)).toEqual({ direction: 'down', text: '-30% vs last month' });
  });

  it('says so when nothing changed', () => {
    expect(formatDelta(5, 5)).toEqual({ direction: 'flat', text: 'No change vs last month' });
  });

  it('returns null when there is no baseline, rather than inventing a percentage', () => {
    expect(formatDelta(4, 0)).toBeNull();
    expect(formatDelta(0, 0)).toBeNull();
  });

  it('returns null for missing or non-numeric input', () => {
    expect(formatDelta(undefined, 3)).toBeNull();
    expect(formatDelta(3, null)).toBeNull();
    expect(formatDelta(NaN, 3)).toBeNull();
  });

  it('never shows a real change as 0%', () => {
    expect(formatDelta(1001, 1000).text).toBe('+1% vs last month');
    expect(formatDelta(999, 1000).text).toBe('-1% vs last month');
  });

  it('rounds to a whole percent and can exceed 100', () => {
    expect(formatDelta(2, 3).text).toBe('-33% vs last month');
    expect(formatDelta(7, 3).text).toBe('+133% vs last month');
  });

  it('takes a custom comparison period', () => {
    expect(formatDelta(3, 2, { period: 'last week' }).text).toBe('+50% vs last week');
  });
});

describe('formatPendingHint', () => {
  it('lists drafts and pending invites with the right plurals', () => {
    expect(formatPendingHint({ drafts: 2, pendingInvites: 1 })).toBe('2 drafts · 1 pending invite');
    expect(formatPendingHint({ drafts: 1, pendingInvites: 3 })).toBe('1 draft · 3 pending invites');
  });

  it('omits the part that is zero', () => {
    expect(formatPendingHint({ drafts: 0, pendingInvites: 2 })).toBe('2 pending invites');
    expect(formatPendingHint({ drafts: 4, pendingInvites: 0 })).toBe('4 drafts');
  });

  it('leaves invites out entirely when the caller cannot see them (null, not 0)', () => {
    expect(formatPendingHint({ drafts: 1, pendingInvites: null })).toBe('1 draft');
  });

  it('says all caught up when there is nothing', () => {
    expect(formatPendingHint({ drafts: 0, pendingInvites: 0 })).toBe('All caught up');
    expect(formatPendingHint({ drafts: 0, pendingInvites: null })).toBe('All caught up');
    expect(formatPendingHint()).toBe('All caught up');
  });
});
