import { DEFAULT_TIMEZONE, isValidTimeZone } from './eventTime.js';

// A curated IANA list rather than Intl.supportedValuesOf('timeZone'): that list is enormous, and
// on some runtimes it omits zones that are perfectly valid (Asia/Kolkata, UTC).
export const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Asia/Kolkata', label: 'India (Asia/Kolkata)' },
  { value: 'Asia/Dubai', label: 'Dubai (Asia/Dubai)' },
  { value: 'Asia/Karachi', label: 'Pakistan (Asia/Karachi)' },
  { value: 'Asia/Dhaka', label: 'Bangladesh (Asia/Dhaka)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (Asia/Bangkok)' },
  { value: 'Asia/Singapore', label: 'Singapore (Asia/Singapore)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (Asia/Hong_Kong)' },
  { value: 'Asia/Shanghai', label: 'China (Asia/Shanghai)' },
  { value: 'Asia/Tokyo', label: 'Japan (Asia/Tokyo)' },
  { value: 'Asia/Seoul', label: 'Korea (Asia/Seoul)' },
  { value: 'Australia/Sydney', label: 'Sydney (Australia/Sydney)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (Pacific/Auckland)' },
  { value: 'Europe/London', label: 'London (Europe/London)' },
  { value: 'Europe/Dublin', label: 'Dublin (Europe/Dublin)' },
  { value: 'Europe/Paris', label: 'Paris (Europe/Paris)' },
  { value: 'Europe/Berlin', label: 'Berlin (Europe/Berlin)' },
  { value: 'Europe/Madrid', label: 'Madrid (Europe/Madrid)' },
  { value: 'Europe/Istanbul', label: 'Istanbul (Europe/Istanbul)' },
  { value: 'Africa/Johannesburg', label: 'South Africa (Africa/Johannesburg)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (America/Sao_Paulo)' },
  { value: 'America/New_York', label: 'New York (America/New_York)' },
  { value: 'America/Chicago', label: 'Chicago (America/Chicago)' },
  { value: 'America/Denver', label: 'Denver (America/Denver)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (America/Los_Angeles)' },
];

// The list plus the event's current value if it isn't in it (an edited event may carry a zone the
// curated list doesn't include), so opening the editor never silently changes it.
export function timezoneOptionsFor(currentValue) {
  if (!currentValue || TIMEZONE_OPTIONS.some((o) => o.value === currentValue)) return TIMEZONE_OPTIONS;
  const label = isValidTimeZone(currentValue) ? currentValue : `${currentValue} (unrecognised — pick a zone)`;
  return [{ value: currentValue, label }, ...TIMEZONE_OPTIONS];
}

export { DEFAULT_TIMEZONE };
