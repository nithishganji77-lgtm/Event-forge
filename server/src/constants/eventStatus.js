export const EVENT_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  REGISTRATION_OPEN: 'REGISTRATION_OPEN',
  REGISTRATION_CLOSED: 'REGISTRATION_CLOSED',
  ONGOING: 'ONGOING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
});

export const EVENT_STATUS_VALUES = Object.values(EVENT_STATUS);

// What `GET /events?status=` accepts: every displayStatus plus UPCOMING (published and not started
// yet, regardless of registration state). Kept separate from EVENT_STATUS because that list also
// feeds the Mongoose enum for Event.status, and UPCOMING is never a stored or displayed value.
export const EVENT_STATUS_FILTER_VALUES = [...EVENT_STATUS_VALUES, 'UPCOMING'];

export const REGISTRATION_STATUS = Object.freeze({
  REGISTERED: 'REGISTERED',
  WAITLISTED: 'WAITLISTED',
  CANCELLED: 'CANCELLED',
});

export const REGISTRATION_STATUS_VALUES = Object.values(REGISTRATION_STATUS);

export const ATTENDANCE_STATUS = Object.freeze({
  PENDING: 'PENDING',
  ATTENDED: 'ATTENDED',
  NO_SHOW: 'NO_SHOW',
});

export const ATTENDANCE_STATUS_VALUES = Object.values(ATTENDANCE_STATUS);
