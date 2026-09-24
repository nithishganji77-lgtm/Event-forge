import mongoose from 'mongoose';
import { EVENT_STATUS, EVENT_STATUS_VALUES } from '../constants/eventStatus.js';
import { DEFAULT_TIMEZONE, isValidTimeZone, computeEventInstants } from '../utils/eventTime.js';

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    room: { type: String, trim: true, default: '' },
    mapUrl: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: '', maxlength: 5000 },
    coverImage: { type: String, default: null },
    category: { type: String, trim: true, default: 'General' },
    status: { type: String, enum: EVENT_STATUS_VALUES, default: EVENT_STATUS.DRAFT },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    timezone: {
      type: String,
      default: DEFAULT_TIMEZONE,
      // Mongoose validates every loaded path on save(), not just modified ones, so this must gate
      // itself: a legacy row with a bad zone (free text from before the wizard had a picker) still
      // has to be saveable for unrelated reasons — the reminder cron, a cancel — until the boot
      // backfill normalises it. Only a write that actually sets the zone is checked.
      validate: {
        validator(value) {
          return !(this.isNew || this.isModified('timezone')) || isValidTimeZone(value);
        },
        message: 'Unknown timezone',
      },
    },

    // Derived in the pre('validate') hook below from the date/time/timezone fields above — never
    // set by clients. startsAt/endsAt are what status, filters and the publish rule compare to
    // `now`; startDate/endDate remain the calendar-date fields the calendar view filters on.
    startsAt: { type: Date },
    endsAt: {
      type: Date,
      validate: {
        // Same self-gating as timezone: checked only when the window was just (re)computed.
        validator(value) {
          const written = this.isNew || this.isModified('endsAt') || this.isModified('startsAt');
          return !written || !this.startsAt || value >= this.startsAt;
        },
        message: 'End must not be before the start',
      },
    },
    registrationClosesAt: { type: Date, default: null },

    venue: { type: venueSchema, default: () => ({}) },
    capacity: { type: Number, required: true, min: 1 },
    registrationDeadline: { type: Date, default: null },

    organizers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date, default: null },
    // Idempotency guard for the deadline-approaching reminder cron (jobs/deadlineReminder.job.js) —
    // set once a reminder fires for this event so a later tick doesn't re-notify.
    deadlineReminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const INSTANT_SOURCE_PATHS = [
  'startDate',
  'endDate',
  'startTime',
  'endTime',
  'timezone',
  'registrationDeadline',
];

// Recompute only when a source field changed (or the instants were never computed), so unrelated
// saves — the deadline-reminder cron stamping deadlineReminderSentAt, a cancel — never touch or
// re-validate them. Every Event write path is Event.create or doc.save(), so this covers all of them.
eventSchema.pre('validate', function computeInstants() {
  const sourceChanged = this.isNew || INSTANT_SOURCE_PATHS.some((path) => this.isModified(path));
  if (!sourceChanged && this.startsAt && this.endsAt) return;
  if (!this.startDate || !this.endDate) return; // `required` validation reports these

  const { startsAt, endsAt, registrationClosesAt } = computeEventInstants(this);
  this.startsAt = startsAt;
  this.endsAt = endsAt;
  this.registrationClosesAt = registrationClosesAt;
});

eventSchema.index({ organization: 1, status: 1 });
eventSchema.index({ organization: 1, startDate: 1 });
eventSchema.index({ organization: 1, startsAt: 1 });
eventSchema.index({ organization: 1, status: 1, startsAt: 1 });
eventSchema.index({ organization: 1, slug: 1 }, { unique: true });
eventSchema.index({ status: 1, registrationClosesAt: 1, deadlineReminderSentAt: 1 });

export const Event = mongoose.model('Event', eventSchema);
