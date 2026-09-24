import mongoose from 'mongoose';
import {
  REGISTRATION_STATUS,
  REGISTRATION_STATUS_VALUES,
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_VALUES,
} from '../constants/eventStatus.js';

const eventRegistrationSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    status: {
      type: String,
      enum: REGISTRATION_STATUS_VALUES,
      default: REGISTRATION_STATUS.REGISTERED,
    },
    registeredAt: { type: Date, default: Date.now },
    cancelledAt: { type: Date, default: null },
    attendanceStatus: {
      type: String,
      enum: ATTENDANCE_STATUS_VALUES,
      default: ATTENDANCE_STATUS.PENDING,
    },
  },
  { timestamps: true }
);

eventRegistrationSchema.index({ event: 1, user: 1 }, { unique: true });
eventRegistrationSchema.index({ event: 1, status: 1 });
// Dashboard "new sign-ups this/last month" windows on registeredAt within an organization.
eventRegistrationSchema.index({ organization: 1, registeredAt: 1 });

export const EventRegistration = mongoose.model('EventRegistration', eventRegistrationSchema);
