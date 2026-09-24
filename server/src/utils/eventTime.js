// Timezone-aware event time math using only Intl.DateTimeFormat (no dependency).
//
// Event.startDate/endDate/registrationDeadline are stored as the UTC midnight of the calendar
// date the client picked; startTime/endTime are "HH:mm" wall-clock strings interpreted in
// event.timezone. These helpers combine them into real instants (startsAt/endsAt/
// registrationClosesAt) so status, filters and publish rules can compare against `now`.

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MS = 24 * 60 * 60 * 1000;

const formatterCache = new Map();

function getFormatter(timeZone) {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

// Deliberately not Intl.supportedValuesOf('timeZone'): on current Node it omits valid zones such
// as Asia/Kolkata and UTC. Constructing a formatter is the check that actually matters.
export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || timeZone.length === 0) return false;
  try {
    getFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function isValidTimeOfDay(value) {
  return value === '' || (typeof value === 'string' && HH_MM.test(value));
}

// Milliseconds to add to a UTC instant to get the wall-clock time in `timeZone` (as if that wall
// clock were UTC). The formatter truncates to whole seconds, so compare against the truncated t.
function offsetMs(t, timeZone) {
  const parts = getFormatter(timeZone).formatToParts(new Date(t));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const wallAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second')
  );
  return wallAsUtc - Math.floor(t / 1000) * 1000;
}

// Wall-clock fields in `timeZone` -> UTC epoch ms. A two-pass "subtract the offset twice" is wrong
// inside a DST gap, so try the offsets on both sides of the target day and keep only a candidate
// whose own offset reproduces the wall time:
//   - one survivor: the normal case
//   - two survivors (fall-back overlap): the earlier instant
//   - none (spring-forward gap, the wall time doesn't exist): shift forward by using the offset
//     from before the gap
export function zonedTimeToUtc(
  { year, month, day, hour = 0, minute = 0, second = 0, ms = 0 },
  timeZone
) {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second, ms);
  const offBefore = offsetMs(guess - DAY_MS, timeZone);
  const offAfter = offsetMs(guess + DAY_MS, timeZone);
  const candidates = [guess - offBefore, guess - offAfter].filter(
    (t) => offsetMs(t, timeZone) === guess - t
  );
  if (candidates.length === 0) return guess - offBefore;
  return Math.min(...candidates);
}

function hasUtcTimeOfDay(date) {
  return (
    date.getUTCHours() !== 0 ||
    date.getUTCMinutes() !== 0 ||
    date.getUTCSeconds() !== 0 ||
    date.getUTCMilliseconds() !== 0
  );
}

// Precedence:
//   1. an "HH:mm" time is present     -> the date's UTC Y-M-D at that wall time in `timeZone`
//   2. no time, but the date carries a UTC time-of-day (never produced by the date picker; this is
//      how legacy rows and test fixtures store an exact instant) -> that exact instant
//   3. otherwise                       -> start of day (or 23:59:59.999 for an end) in `timeZone`
function instantFor(date, time, timeZone, edge) {
  const fields = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };

  const match = typeof time === 'string' ? HH_MM.exec(time) : null;
  if (match) {
    return new Date(
      zonedTimeToUtc({ ...fields, hour: Number(match[1]), minute: Number(match[2]) }, timeZone)
    );
  }
  if (hasUtcTimeOfDay(date)) return new Date(date.getTime());

  return edge === 'end'
    ? new Date(zonedTimeToUtc({ ...fields, hour: 23, minute: 59, second: 59, ms: 999 }, timeZone))
    : new Date(zonedTimeToUtc(fields, timeZone));
}

// An unknown/legacy timezone (e.g. free text like "IST" from before the wizard had a picker)
// falls back to the app default rather than throwing — model validation rejects invalid zones on
// write, and the backfill normalises legacy rows.
export function computeEventInstants({
  startDate,
  endDate,
  startTime,
  endTime,
  timezone,
  registrationDeadline,
}) {
  const timeZone = isValidTimeZone(timezone) ? timezone : DEFAULT_TIMEZONE;
  return {
    startsAt: instantFor(startDate, startTime, timeZone, 'start'),
    endsAt: instantFor(endDate, endTime, timeZone, 'end'),
    registrationClosesAt: registrationDeadline
      ? instantFor(registrationDeadline, '', timeZone, 'end')
      : null,
  };
}

// Start instants of last month, this month and next month as they fall in `timeZone` (an unknown
// zone falls back to UTC). "This month" means the caller's own calendar month — an event that
// starts at 00:30 IST on the 1st is in that month for an Indian organizer even though it is still
// the 31st in UTC.
export function monthBoundsInZone(now, timeZone) {
  const zone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  const parts = getFormatter(zone).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year').value);
  const month = Number(parts.find((p) => p.type === 'month').value);
  const startOf = (y, m) => new Date(zonedTimeToUtc({ year: y, month: m, day: 1 }, zone));

  return {
    lastStart: month === 1 ? startOf(year - 1, 12) : startOf(year, month - 1),
    thisStart: startOf(year, month),
    nextStart: month === 12 ? startOf(year + 1, 1) : startOf(year, month + 1),
  };
}
