import { formatEventDay, formatTimeOfDay } from './eventTime.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const utcDay = (dateLike) => Math.floor(new Date(dateLike).getTime() / DAY_MS);

function minutesOf(hhmm) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm ?? '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

// "2 days" for a multi-day event, "2h 30m" for a same-day one with both times, "1 day" otherwise.
// Days are counted inclusively from the stored calendar dates (UTC midnight), so an event on
// Sep 24 and 25 is 2 days whatever the viewer's timezone.
export function formatDuration(event) {
  const days = utcDay(event.endDate) - utcDay(event.startDate) + 1;
  if (days > 1) return `${days} days`;

  const start = minutesOf(event.startTime);
  const end = minutesOf(event.endTime);
  if (start !== null && end !== null && end > start) {
    const minutes = end - start;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return `${rest}m`;
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
  }
  return '1 day';
}

// "0.5%" for 1 of 200. Whole numbers once it is 10% or more, one decimal below that so a small
// number of sign-ups never rounds down to a misleading "0%".
export function formatPercent(part, whole) {
  if (!whole || whole <= 0 || !part || part <= 0) return '0%';
  const percent = Math.min(100, (part / whole) * 100);
  if (percent >= 10) return `${Math.round(percent)}%`;
  const rounded = Math.round(percent * 10) / 10;
  return `${rounded < 0.1 ? '<0.1' : rounded}%`;
}

// "10:00 AM – 6:00 PM", "10:00 AM", or "All day" when the event has no start time.
export function formatTimeRange(event) {
  const start = formatTimeOfDay(event.startTime);
  if (!start) return 'All day';
  const end = formatTimeOfDay(event.endTime);
  return end && end !== start ? `${start} – ${end}` : start;
}

// The registration line of the details panel, taken from the server's displayStatus so it cannot
// disagree with the register button.
export function registrationSummary(event) {
  switch (event.displayStatus) {
    case 'DRAFT':
      return { label: 'Not open yet', detail: 'Publish the event to open registration' };
    case 'CANCELLED':
      return { label: 'Closed', detail: 'This event was cancelled' };
    case 'COMPLETED':
      return { label: 'Closed', detail: 'This event has ended' };
    case 'ONGOING':
      return { label: 'Closed', detail: 'The event has started' };
    case 'REGISTRATION_CLOSED':
      return { label: 'Closed', detail: 'The registration deadline has passed' };
    default: {
      const full = event.capacity > 0 && event.registeredCount >= event.capacity;
      const closes = event.registrationDeadline
        ? `Closes ${formatEventDay(event.registrationDeadline, { year: true })}`
        : 'Open until the event starts';
      return full ? { label: 'Full', detail: 'New sign-ups join the waitlist' } : { label: 'Open', detail: closes };
    }
  }
}
