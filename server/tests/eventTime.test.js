import {
  zonedTimeToUtc,
  computeEventInstants,
  isValidTimeZone,
  isValidTimeOfDay,
  monthBoundsInZone,
} from '../src/utils/eventTime.js';

const iso = (ms) => new Date(ms).toISOString();
const utcMidnight = (yyyyMmDd) => new Date(`${yyyyMmDd}T00:00:00.000Z`);

describe('zonedTimeToUtc', () => {
  it('converts a wall time in a zone with no DST (Asia/Kolkata is UTC+5:30)', () => {
    const t = zonedTimeToUtc({ year: 2026, month: 9, day: 24, hour: 18 }, 'Asia/Kolkata');
    expect(iso(t)).toBe('2026-09-24T12:30:00.000Z');
  });

  it('uses the correct offset on each side of a DST change (America/New_York)', () => {
    const beforeEst = zonedTimeToUtc({ year: 2026, month: 3, day: 6, hour: 9 }, 'America/New_York');
    const afterEdt = zonedTimeToUtc({ year: 2026, month: 3, day: 9, hour: 9 }, 'America/New_York');
    expect(iso(beforeEst)).toBe('2026-03-06T14:00:00.000Z'); // EST, UTC-5
    expect(iso(afterEdt)).toBe('2026-03-09T13:00:00.000Z'); // EDT, UTC-4
  });

  it('moves a wall time that does not exist (spring-forward gap) to just after the gap', () => {
    // 02:30 on 2026-03-08 never happens in New York: clocks jump 02:00 -> 03:00.
    const t = zonedTimeToUtc({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, 'America/New_York');
    expect(iso(t)).toBe('2026-03-08T07:30:00.000Z'); // 03:30 EDT, not the 01:30 EST a naive two-pass gives
  });

  it('picks the earlier instant for a wall time that happens twice (fall-back overlap)', () => {
    // 01:30 on 2026-11-01 happens once in EDT and again in EST.
    const t = zonedTimeToUtc({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, 'America/New_York');
    expect(iso(t)).toBe('2026-11-01T05:30:00.000Z'); // the EDT one
  });

  it('handles a zone east of UTC that observes DST (Europe/London in summer is UTC+1)', () => {
    const t = zonedTimeToUtc({ year: 2026, month: 7, day: 1, hour: 12 }, 'Europe/London');
    expect(iso(t)).toBe('2026-07-01T11:00:00.000Z');
  });

  it('handles a zone west of UTC (America/Sao_Paulo is UTC-3)', () => {
    const t = zonedTimeToUtc({ year: 2026, month: 7, day: 1, hour: 12 }, 'America/Sao_Paulo');
    expect(iso(t)).toBe('2026-07-01T15:00:00.000Z');
  });
});

describe('isValidTimeZone / isValidTimeOfDay', () => {
  it('accepts real IANA zones and rejects anything else', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('America/New_York')).toBe(true);
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
    expect(isValidTimeZone(123)).toBe(false);
  });

  it('accepts empty or zero-padded 24-hour HH:mm and rejects everything else', () => {
    for (const ok of ['', '00:00', '09:05', '18:00', '23:59']) expect(isValidTimeOfDay(ok)).toBe(true);
    for (const bad of ['24:00', '9:30', '12:60', '6 PM', 'abc', undefined, null]) {
      expect(isValidTimeOfDay(bad)).toBe(false);
    }
  });
});

describe('computeEventInstants', () => {
  it('rule 1: a start time is applied to the picked calendar date in the event timezone', () => {
    const r = computeEventInstants({
      startDate: utcMidnight('2026-09-24'),
      endDate: utcMidnight('2026-09-24'),
      startTime: '18:00',
      endTime: '20:30',
      timezone: 'Asia/Kolkata',
      registrationDeadline: null,
    });
    expect(r.startsAt.toISOString()).toBe('2026-09-24T12:30:00.000Z');
    expect(r.endsAt.toISOString()).toBe('2026-09-24T15:00:00.000Z');
    expect(r.registrationClosesAt).toBeNull();
  });

  it('rule 3: with no time, an event spans the whole calendar day in its own timezone', () => {
    const r = computeEventInstants({
      startDate: utcMidnight('2026-09-24'),
      endDate: utcMidnight('2026-09-24'),
      startTime: '',
      endTime: '',
      timezone: 'Asia/Kolkata',
      registrationDeadline: null,
    });
    expect(r.startsAt.toISOString()).toBe('2026-09-23T18:30:00.000Z'); // 00:00 IST on the 24th
    expect(r.endsAt.toISOString()).toBe('2026-09-24T18:29:59.999Z'); // 23:59:59.999 IST on the 24th
  });

  it('a multi-day event takes its start from the first day and its end from the last', () => {
    const r = computeEventInstants({
      startDate: utcMidnight('2026-09-24'),
      endDate: utcMidnight('2026-09-26'),
      startTime: '09:00',
      endTime: '17:30',
      timezone: 'America/New_York',
      registrationDeadline: null,
    });
    expect(r.startsAt.toISOString()).toBe('2026-09-24T13:00:00.000Z'); // EDT
    expect(r.endsAt.toISOString()).toBe('2026-09-26T21:30:00.000Z');
  });

  it('rule 2: a date that already carries a UTC time-of-day is kept as an exact instant', () => {
    const r = computeEventInstants({
      startDate: new Date('2026-06-15T13:07:00.000Z'),
      endDate: new Date('2026-06-15T15:07:00.000Z'),
      startTime: '',
      endTime: '',
      timezone: 'Asia/Kolkata',
      registrationDeadline: new Date('2026-06-15T12:00:00.000Z'),
    });
    expect(r.startsAt.toISOString()).toBe('2026-06-15T13:07:00.000Z');
    expect(r.endsAt.toISOString()).toBe('2026-06-15T15:07:00.000Z');
    expect(r.registrationClosesAt.toISOString()).toBe('2026-06-15T12:00:00.000Z');
  });

  it('registration stays open through the whole deadline day in the event timezone', () => {
    const r = computeEventInstants({
      startDate: utcMidnight('2026-09-24'),
      endDate: utcMidnight('2026-09-24'),
      startTime: '18:00',
      endTime: '',
      timezone: 'Asia/Kolkata',
      registrationDeadline: utcMidnight('2026-09-23'),
    });
    // End of 23 Sep in IST — not 00:00 UTC on the 23rd, which is what the date-only field meant.
    expect(r.registrationClosesAt.toISOString()).toBe('2026-09-23T18:29:59.999Z');
  });

  it('falls back to the app default zone (Asia/Kolkata) for an unknown timezone instead of throwing', () => {
    const r = computeEventInstants({
      startDate: utcMidnight('2026-09-24'),
      endDate: utcMidnight('2026-09-24'),
      startTime: '18:00',
      endTime: '',
      timezone: 'Not/AZone',
      registrationDeadline: null,
    });
    expect(r.startsAt.toISOString()).toBe('2026-09-24T12:30:00.000Z');
  });
});

describe('monthBoundsInZone', () => {
  const iso = (d) => d.toISOString();

  it("returns the caller's own calendar-month boundaries (Asia/Kolkata is UTC+5:30)", () => {
    const b = monthBoundsInZone(new Date('2026-09-24T10:00:00.000Z'), 'Asia/Kolkata');
    expect(iso(b.lastStart)).toBe('2026-07-31T18:30:00.000Z'); // 1 Aug 00:00 IST
    expect(iso(b.thisStart)).toBe('2026-08-31T18:30:00.000Z'); // 1 Sep 00:00 IST
    expect(iso(b.nextStart)).toBe('2026-09-30T18:30:00.000Z'); // 1 Oct 00:00 IST
  });

  it('is decided by the zone, not by the UTC date — 23:00Z on the 30th is already October in IST', () => {
    const utc = monthBoundsInZone(new Date('2026-09-30T23:00:00.000Z'), 'UTC');
    const ist = monthBoundsInZone(new Date('2026-09-30T23:00:00.000Z'), 'Asia/Kolkata');
    expect(iso(utc.thisStart)).toBe('2026-09-01T00:00:00.000Z');
    expect(iso(ist.thisStart)).toBe('2026-09-30T18:30:00.000Z'); // 1 Oct 00:00 IST
  });

  it('wraps across the year boundary in both directions', () => {
    const jan = monthBoundsInZone(new Date('2026-01-15T12:00:00.000Z'), 'UTC');
    expect(iso(jan.lastStart)).toBe('2025-12-01T00:00:00.000Z');
    const dec = monthBoundsInZone(new Date('2026-12-15T12:00:00.000Z'), 'UTC');
    expect(iso(dec.nextStart)).toBe('2027-01-01T00:00:00.000Z');
  });

  it('falls back to UTC for an unknown zone', () => {
    const b = monthBoundsInZone(new Date('2026-09-24T10:00:00.000Z'), 'Not/AZone');
    expect(iso(b.thisStart)).toBe('2026-09-01T00:00:00.000Z');
  });
});
