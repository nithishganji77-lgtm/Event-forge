// Mirrors the server's meaning of an event's time fields (server/src/utils/eventTime.js):
//   - startDate/endDate are the calendar date the organizer picked, stored at UTC midnight
//   - startTime/endTime are "HH:mm" wall-clock times in event.timezone (or '' when not set)
// so a date is always read in UTC (reading it in the viewer's zone shows the previous day to anyone
// west of UTC) and a time needs no timezone conversion just to be displayed.

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || timeZone.length === 0) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

const dayKey = (dateLike) => new Date(dateLike).toISOString().slice(0, 10);

export function formatEventDay(dateLike, { weekday = false, year = false } = {}) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    ...(weekday && { weekday: 'short' }),
    ...(year && { year: 'numeric' }),
  }).format(new Date(dateLike));
}

// "18:00" -> "6:00 PM" (in the viewer's locale). Returns '' for a blank/invalid time so callers can
// simply omit it — a blank startTime means the event has no specific time, not "midnight".
export function formatTimeOfDay(hhmm) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm ?? '');
  if (!match) return '';
  return new Intl.DateTimeFormat(undefined, {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(Date.UTC(2000, 0, 1, Number(match[1]), Number(match[2]))));
}

// "Sep 24" or "Sep 24 – Sep 26": the dates alone, however many days the event spans.
export function formatEventDates(event, options) {
  const startDay = formatEventDay(event.startDate, options);
  const multiDay = event.endDate && dayKey(event.endDate) !== dayKey(event.startDate);
  return multiDay ? `${startDay} – ${formatEventDay(event.endDate, options)}` : startDay;
}

// "Sep 24 · 6:00 PM", "Sep 24 – Sep 26 · 6:00 PM", or just the date when no start time is set.
export function formatEventWhen(event, options) {
  const days = formatEventDates(event, options);
  const time = formatTimeOfDay(event.startTime);
  return time ? `${days} · ${time}` : days;
}
