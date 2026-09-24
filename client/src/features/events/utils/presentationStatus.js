import { FileEdit, CalendarClock, Timer, Radio, CheckCheck, XCircle } from 'lucide-react';

// What an organizer sees on a card or badge. Derived from the SERVER's displayStatus, never by
// re-deriving date boundaries on the client — RegisterButton and the filters read displayStatus,
// so a second opinion here could disagree with them. The client clock is used for exactly one
// thing: promoting UPCOMING to STARTING_SOON with a countdown.
//
//   displayStatus                         -> shown as
//   DRAFT / CANCELLED / COMPLETED         -> DRAFT / CANCELLED / COMPLETED
//   ONGOING                               -> LIVE
//   REGISTRATION_OPEN / _CLOSED           -> UPCOMING (or STARTING_SOON, see below)
//
// Registration being closed is a separate fact from the event's stage, so it comes back as a flag
// for the card to mention in small text instead of becoming its own status.
export const PRESENTATION_STATUS = {
  DRAFT: { tone: 'neutral', icon: FileEdit, label: 'Draft' },
  UPCOMING: { tone: 'neutral', icon: CalendarClock, label: 'Upcoming' },
  STARTING_SOON: { tone: 'accent', icon: Timer, label: 'Starting soon' },
  LIVE: { tone: 'accent', icon: Radio, label: 'Live' },
  COMPLETED: { tone: 'neutral', icon: CheckCheck, label: 'Completed' },
  CANCELLED: { tone: 'neutral', icon: XCircle, label: 'Cancelled' },
};

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
export const STARTING_SOON_WINDOW_MS = 24 * HOUR_MS;

// "2H 15M", "45M", "3H". Rounds up so it never reads "0M" while there is still time left.
export function formatCountdown(ms) {
  const totalMinutes = Math.max(1, Math.ceil(ms / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}M`;
  return minutes === 0 ? `${hours}H` : `${hours}H ${minutes}M`;
}

export function getPresentationStatus(event, now = Date.now()) {
  let key;
  switch (event.displayStatus) {
    case 'DRAFT':
      key = 'DRAFT';
      break;
    case 'CANCELLED':
      key = 'CANCELLED';
      break;
    case 'COMPLETED':
      key = 'COMPLETED';
      break;
    case 'ONGOING':
      key = 'LIVE';
      break;
    default:
      key = 'UPCOMING';
  }

  // A countdown only means something when the event has a real start time. Without one, startsAt
  // is just the start of the day, and "starts in 3H" would be a made-up number.
  let countdownMs = null;
  if (key === 'UPCOMING' && event.startTime && event.startsAt) {
    const untilStart = new Date(event.startsAt).getTime() - now;
    if (untilStart > 0 && untilStart <= STARTING_SOON_WINDOW_MS) {
      key = 'STARTING_SOON';
      countdownMs = untilStart;
    }
  }

  const config = PRESENTATION_STATUS[key];
  return {
    key,
    tone: config.tone,
    icon: config.icon,
    label: countdownMs === null ? config.label : `Starts in ${formatCountdown(countdownMs)}`,
    countdownMs,
    registrationClosed: event.displayStatus === 'REGISTRATION_CLOSED',
  };
}
