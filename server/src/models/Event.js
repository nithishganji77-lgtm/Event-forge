import mongoose from 'mongoose';
import { EVENT_STATUS, EVENT_STATUS_VALUES } from '../constants/eventStatus.js';

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
    timezone: { type: String, default: 'Asia/Kolkata' },

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

eventSchema.index({ organization: 1, status: 1 });
eventSchema.index({ organization: 1, startDate: 1 });
eventSchema.index({ organization: 1, slug: 1 }, { unique: true });
eventSchema.index({ status: 1, registrationDeadline: 1, deadlineReminderSentAt: 1 });

export const Event = mongoose.model('Event', eventSchema);
