const plural = (count, singular, pluralForm = `${singular}s`) => `${count} ${count === 1 ? singular : pluralForm}`;

// Month-over-month change for a KPI tile, or null when there is nothing honest to say: with no
// baseline (last month was 0) a percentage is undefined, and inventing "+100%" or "new!" would
// overstate a move from nothing. `noun` names what changed ("new sign-ups") so the words carry the
// meaning, not just the arrow.
export function formatDelta(current, previous, { noun = '', period = 'last month' } = {}) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  if (current === previous) return { direction: 'flat', text: `No change vs ${period}` };

  const up = current > previous;
  // A real change never reads as "0%" — round up to 1.
  const percent = Math.max(1, Math.round((Math.abs(current - previous) / previous) * 100));
  return {
    direction: up ? 'up' : 'down',
    text: `${up ? '+' : '-'}${percent}%${noun ? ` ${noun}` : ''} vs ${period}`,
  };
}

// "2 drafts · 1 pending invite". A null pendingInvites means the caller can't see invites at all
// (the server sends null, not 0), so that part is omitted rather than shown as "0 pending invites".
export function formatPendingHint({ drafts = 0, pendingInvites = null } = {}) {
  const parts = [];
  if (drafts > 0) parts.push(plural(drafts, 'draft'));
  if (pendingInvites > 0) parts.push(plural(pendingInvites, 'pending invite'));
  return parts.length > 0 ? parts.join(' · ') : 'All caught up';
}
