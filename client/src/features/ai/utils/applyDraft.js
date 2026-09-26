// Turning a ForgeAI draft into what the event form holds. The model's answer is a richer shape than
// an event (tagline, agenda, venue ideas), and the Event model has no fields for those, so the
// tagline and agenda become readable text at the top and bottom of the description, where the
// organizer can edit them like anything else they typed.

export const DESCRIPTION_LIMIT = 5000; // event.schema.js: description max

const dayHeading = (day) => `Day ${day}`;

// "09:30 Welcome and coffee - Doors open, badges at the desk". Days get a heading only when there
// is more than one.
export function formatAgendaText(agenda) {
  if (!agenda?.length) return '';
  const multiDay = new Set(agenda.map((item) => item.day)).size > 1;
  const lines = [];
  let currentDay = null;
  for (const item of agenda) {
    if (multiDay && item.day !== currentDay) {
      if (currentDay !== null) lines.push('');
      lines.push(dayHeading(item.day));
      currentDay = item.day;
    }
    lines.push(`${item.time} ${item.title}${item.details ? ` - ${item.details}` : ''}`);
  }
  return lines.join('\n');
}

// tagline, the description, then the agenda under an "Agenda" heading. If it would pass the limit
// the agenda is cut at a whole line: half a sentence is worse than a shorter schedule.
export function composeDescription(draft, max = DESCRIPTION_LIMIT) {
  const head = [draft.tagline, draft.description].filter(Boolean).join('\n\n').slice(0, max);
  const agenda = formatAgendaText(draft.agenda);
  if (!agenda) return head;

  const heading = `${head}\n\nAgenda`;
  let text = heading;
  for (const line of agenda.split('\n')) {
    const next = `${text}\n${line}`;
    if (next.length > max) break;
    text = next;
  }
  // No agenda line fit: an "Agenda" heading with nothing under it helps nobody.
  return text === heading ? head : text.trimEnd();
}

const pad = (n) => String(n).padStart(2, '0');
const isoDay = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

// The last day to register: `daysBefore` days ahead of the start. Calendar arithmetic in UTC so the
// browser's time zone can't shift the date. '' when there is no start date, or when that day has
// already passed (an event that closes registration before anyone sees it is worse than an open one).
export function registrationDeadlineFor(startDate, daysBefore, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate ?? '') || !Number.isFinite(daysBefore)) return '';
  const [year, month, day] = startDate.split('-').map(Number);
  const deadline = new Date(Date.UTC(year, month - 1, day - daysBefore));
  if (Number.isNaN(deadline.getTime())) return '';
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const iso = isoDay(deadline);
  return iso < todayIso ? '' : iso;
}

// The form fields a draft fills. Only what the draft can honestly say: the venue name only when a
// venue idea was picked, the deadline only when the start date is already known.
export function draftToFormPatch(draft, { venue, startDate, today } = {}) {
  const patch = {
    title: draft.title,
    category: draft.category,
    capacity: draft.capacity,
    description: composeDescription(draft),
  };
  if (venue?.name) patch.venue = { name: venue.name };
  const deadline = registrationDeadlineFor(startDate, draft.registrationDeadlineDaysBefore, today);
  if (deadline) patch.registrationDeadline = deadline;
  return patch;
}
