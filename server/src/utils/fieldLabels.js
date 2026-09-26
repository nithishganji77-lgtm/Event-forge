// Turns a request path like ['venue', 'mapUrl'] or ['startDate'] into the words a person would use
// for it, so a validation failure reads "Start date is required" and not "startDate: Required".
// Only fields whose obvious wording differs from their key need an entry here; the rest are
// humanised from camelCase.
const OVERRIDES = {
  title: 'Event name',
  'venue.name': 'Venue name',
  'venue.address': 'Address',
  'venue.room': 'Room',
  'venue.mapUrl': 'Map link',
  mapUrl: 'Map link',
  coverImage: 'Cover image',
  attendanceStatus: 'Attendance',
  dateFrom: 'Start of the date range',
  dateTo: 'End of the date range',
  tz: 'Timezone',
  organizers: 'Organizers',
};

function humanizeKey(key) {
  const words = String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Array indexes are noise ("organizers.0"), so the label is the last non-numeric segment.
export function humanizeField(path = []) {
  const segments = path.filter((segment) => typeof segment === 'string');
  if (segments.length === 0) return null;
  const dotted = segments.join('.');
  if (OVERRIDES[dotted]) return OVERRIDES[dotted];
  const last = segments[segments.length - 1];
  return OVERRIDES[last] ?? humanizeKey(last);
}
