import { describe, it, expect } from 'vitest';
import { describeActivity } from './describeActivity.js';

const log = (overrides) => ({
  _id: 'log-1',
  action: 'REGISTRATION_CREATED',
  actor: { name: 'Rahul Verma' },
  metadata: { eventId: 'event-1', eventTitle: 'Sreeman Pelli' },
  ...overrides,
});

describe('describeActivity', () => {
  it('reads as a sentence about the event when the row carries its title', () => {
    expect(describeActivity(log())).toEqual({
      actorName: 'Rahul Verma',
      verb: 'registered for',
      target: 'Sreeman Pelli',
      eventId: 'event-1',
    });
  });

  it.each([
    ['EVENT_PUBLISHED', 'published'],
    ['EVENT_CANCELLED', 'cancelled'],
    ['REGISTRATION_WAITLISTED', 'joined the waitlist for'],
    ['REGISTRATION_CANCELLED', 'cancelled their registration for'],
    ['ATTENDANCE_MARKED', 'marked attendance for'],
  ])('%s -> "%s"', (action, verb) => {
    expect(describeActivity(log({ action })).verb).toBe(verb);
  });

  it("does not name the actor of a waitlist promotion: that row's actor is whoever freed the spot", () => {
    const result = describeActivity(log({ metadata: { eventId: 'event-1', eventTitle: 'Sreeman Pelli', promotedFromWaitlist: true } }));
    expect(result.actorName).toBeNull();
    expect(result.verb).toBe('A waitlisted attendee was moved into');
    expect(result.target).toBe('Sreeman Pelli');
  });

  it('has no link for a deleted event', () => {
    const result = describeActivity(log({ action: 'EVENT_DELETED' }));
    expect(result.verb).toBe('deleted');
    expect(result.target).toBe('Sreeman Pelli');
    expect(result.eventId).toBeNull();
  });

  it('falls back to the generic label for older rows without a title', () => {
    expect(describeActivity(log({ metadata: {} }))).toEqual({
      actorName: 'Rahul Verma',
      verb: 'registered for an event',
      target: null,
      eventId: null,
    });
  });

  it('describes actions that are not about an event, and unknown ones, without crashing', () => {
    expect(describeActivity(log({ action: 'INVITE_SENT', metadata: {} })).verb).toBe('sent an invite');
    expect(describeActivity(log({ action: 'SOMETHING_NEW', metadata: undefined })).verb).toBe('something new');
  });

  it('calls a missing actor "Someone"', () => {
    expect(describeActivity(log({ actor: null })).actorName).toBe('Someone');
  });
});
