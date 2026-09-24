import { describe, it, expect } from 'vitest';
import {
  isValidTimeZone,
  formatEventDay,
  formatTimeOfDay,
  formatEventWhen,
} from './eventTime.js';
import { timezoneOptionsFor, TIMEZONE_OPTIONS } from './timezones.js';

describe('isValidTimeZone', () => {
  it('accepts IANA zones and rejects anything else', () => {
    expect(isValidTimeZone('Asia/Kolkata')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
  });
});

describe('formatTimeOfDay', () => {
  it('formats a 24-hour HH:mm wall-clock time without any timezone shift', () => {
    expect(formatTimeOfDay('18:00')).toMatch(/^6:00\s?PM$/i);
    expect(formatTimeOfDay('09:05')).toMatch(/^9:05\s?AM$/i);
  });

  it('returns an empty string for a blank or invalid time so callers can omit it', () => {
    expect(formatTimeOfDay('')).toBe('');
    expect(formatTimeOfDay(undefined)).toBe('');
    expect(formatTimeOfDay('6 PM')).toBe('');
    expect(formatTimeOfDay('24:00')).toBe('');
  });
});

describe('formatEventDay', () => {
  // The picked calendar date is stored at UTC midnight. Reading it in the viewer's zone would show
  // 23 Sep to anyone west of UTC — run this file under TZ=America/Los_Angeles to see that matter.
  it('reads the stored date in UTC, so the picked day is shown to every viewer', () => {
    const text = formatEventDay('2026-09-24T00:00:00.000Z');
    expect(text).toContain('24');
    expect(text).not.toContain('23');
  });

  it('can include the weekday and year', () => {
    const text = formatEventDay('2026-09-24T00:00:00.000Z', { weekday: true, year: true });
    expect(text).toContain('2026');
    expect(text).toMatch(/Thu/i);
  });
});

describe('formatEventWhen', () => {
  const single = { startDate: '2026-09-24T00:00:00.000Z', endDate: '2026-09-24T00:00:00.000Z' };

  it('shows the date and time for a single-day event with a start time', () => {
    const text = formatEventWhen({ ...single, startTime: '18:00' });
    expect(text).toContain('24');
    expect(text).toMatch(/·\s6:00\s?PM$/i);
  });

  it('omits the time entirely when no start time is set (not "12:00 AM")', () => {
    const text = formatEventWhen({ ...single, startTime: '' });
    expect(text).not.toContain('·');
    expect(text).not.toMatch(/AM|PM/i);
  });

  it('shows a range for a multi-day event', () => {
    const text = formatEventWhen({ ...single, endDate: '2026-09-26T00:00:00.000Z', startTime: '09:00' });
    expect(text).toContain('–');
    expect(text).toContain('26');
  });
});

describe('timezoneOptionsFor', () => {
  it('returns the curated list unchanged when the current value is in it', () => {
    expect(timezoneOptionsFor('Asia/Kolkata')).toBe(TIMEZONE_OPTIONS);
  });

  it('prepends an unlisted current value so opening the editor never silently changes it', () => {
    const options = timezoneOptionsFor('Asia/Kathmandu');
    expect(options[0]).toEqual({ value: 'Asia/Kathmandu', label: 'Asia/Kathmandu' });
    expect(options).toHaveLength(TIMEZONE_OPTIONS.length + 1);
  });

  it('flags an unrecognised legacy value so the organizer knows to pick a real zone', () => {
    expect(timezoneOptionsFor('Not/AZone')[0].label).toMatch(/unrecognised/i);
  });
});
