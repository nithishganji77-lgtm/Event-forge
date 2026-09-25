import { describe, it, expect } from 'vitest';
import { formatDuration, formatPercent, formatTimeRange, registrationSummary } from './eventDetails.js';
import { directionsUrl, safeHttpUrl } from './venueLinks.js';
import { eventFormSchema } from '../schemas/event.schema.js';

const day = (iso) => `${iso}T00:00:00.000Z`;

describe('formatDuration', () => {
  it('counts calendar days inclusively', () => {
    expect(formatDuration({ startDate: day('2026-09-24'), endDate: day('2026-09-25') })).toBe('2 days');
    expect(formatDuration({ startDate: day('2026-09-24'), endDate: day('2026-09-30') })).toBe('7 days');
  });

  it('uses hours and minutes for a same-day event with both times', () => {
    const base = { startDate: day('2026-09-24'), endDate: day('2026-09-24') };
    expect(formatDuration({ ...base, startTime: '10:00', endTime: '12:30' })).toBe('2h 30m');
    expect(formatDuration({ ...base, startTime: '10:00', endTime: '13:00' })).toBe('3h');
    expect(formatDuration({ ...base, startTime: '10:00', endTime: '10:45' })).toBe('45m');
  });

  it('falls back to 1 day when the times are missing or make no sense', () => {
    const base = { startDate: day('2026-09-24'), endDate: day('2026-09-24') };
    expect(formatDuration(base)).toBe('1 day');
    expect(formatDuration({ ...base, startTime: '10:00' })).toBe('1 day');
    expect(formatDuration({ ...base, startTime: '18:00', endTime: '09:00' })).toBe('1 day');
  });
});

describe('formatPercent', () => {
  it.each([
    [1, 200, '0.5%'],
    [0, 200, '0%'],
    [50, 200, '25%'],
    [200, 200, '100%'],
    [1, 3, '33%'],
    [1, 1000, '0.1%'],
    [1, 5000, '<0.1%'],
    [250, 200, '100%'],
  ])('%i of %i is %s', (part, whole, expected) => {
    expect(formatPercent(part, whole)).toBe(expected);
  });

  it('does not divide by zero', () => {
    expect(formatPercent(3, 0)).toBe('0%');
    expect(formatPercent(undefined, 10)).toBe('0%');
  });
});

describe('formatTimeRange', () => {
  it('shows the range, just the start, or all day', () => {
    expect(formatTimeRange({ startTime: '10:00', endTime: '18:00' })).toBe('10:00 AM – 6:00 PM');
    expect(formatTimeRange({ startTime: '10:00', endTime: '' })).toBe('10:00 AM');
    expect(formatTimeRange({ startTime: '', endTime: '' })).toBe('All day');
  });
});

describe('registrationSummary', () => {
  const open = { displayStatus: 'REGISTRATION_OPEN', capacity: 10, registeredCount: 3, registrationDeadline: null };

  it('describes an open event, with or without a deadline', () => {
    expect(registrationSummary(open)).toEqual({ label: 'Open', detail: 'Open until the event starts' });
    const withDeadline = registrationSummary({ ...open, registrationDeadline: day('2026-09-27') });
    expect(withDeadline.label).toBe('Open');
    expect(withDeadline.detail).toMatch(/^Closes .*27/);
  });

  it('says Full, not Closed, when at capacity: the waitlist is still open', () => {
    expect(registrationSummary({ ...open, registeredCount: 10 })).toEqual({ label: 'Full', detail: 'New sign-ups join the waitlist' });
  });

  it.each([
    ['DRAFT', 'Not open yet'],
    ['CANCELLED', 'Closed'],
    ['COMPLETED', 'Closed'],
    ['ONGOING', 'Closed'],
    ['REGISTRATION_CLOSED', 'Closed'],
  ])('%s -> %s', (displayStatus, label) => {
    expect(registrationSummary({ ...open, displayStatus }).label).toBe(label);
  });
});

describe('safeHttpUrl', () => {
  it('passes http and https through', () => {
    expect(safeHttpUrl('https://maps.example.com/a?b=1')).toBe('https://maps.example.com/a?b=1');
    expect(safeHttpUrl('  http://example.com ')).toBe('http://example.com/');
  });

  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>1</script>', 'ftp://example.com', 'not a url', '', null, undefined])(
    'refuses %s',
    (value) => {
      expect(safeHttpUrl(value)).toBeNull();
    }
  );
});

describe('directionsUrl', () => {
  it('searches the venue name and address', () => {
    expect(directionsUrl({ name: 'iBlock', address: 'Hyderabad, Telangana' })).toBe(
      'https://www.google.com/maps/search/?api=1&query=iBlock%2C%20Hyderabad%2C%20Telangana'
    );
  });

  it('works from the name alone and gives up with nothing to search', () => {
    expect(directionsUrl({ name: 'iBlock' })).toContain('query=iBlock');
    expect(directionsUrl({ name: '  ', address: '' })).toBeNull();
    expect(directionsUrl(undefined)).toBeNull();
  });
});

describe('the wizard\'s map link field', () => {
  const base = {
    title: 'Launch', category: 'General', startDate: '2026-10-01', endDate: '2026-10-01', capacity: 10,
    venue: { name: 'Hall', address: '', room: '', mapUrl: '' },
  };
  const check = (mapUrl) => eventFormSchema.safeParse({ ...base, venue: { ...base.venue, mapUrl } });

  it('takes http(s) and empty, and refuses other schemes with a message', () => {
    expect(check('https://maps.example.com/x').success).toBe(true);
    expect(check('').success).toBe(true);
    const bad = check('javascript:alert(1)');
    expect(bad.success).toBe(false);
    expect(JSON.stringify(bad.error.issues)).toContain('http');
  });
});
