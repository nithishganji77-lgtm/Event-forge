import { computeDisplayStatus, statusFilterToQuery } from '../src/utils/eventStatus.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeOrg, makeEvent } from './helpers/factories.js';
import { Event } from '../src/models/Event.js';
import { publishEvent } from '../src/services/event.service.js';

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-06-15T12:00:00.000Z');

function stubEvent(overrides) {
  return { status: 'PUBLISHED', startDate: null, endDate: null, registrationDeadline: null, ...overrides };
}

describe('computeDisplayStatus (pure, no DB)', () => {
  it('CANCELLED and DRAFT short-circuit regardless of dates', () => {
    expect(computeDisplayStatus(stubEvent({ status: 'CANCELLED', endDate: new Date(now - HOUR) }), now)).toBe('CANCELLED');
    expect(computeDisplayStatus(stubEvent({ status: 'DRAFT', startDate: new Date(now - HOUR) }), now)).toBe('DRAFT');
  });

  it('COMPLETED once now is past endDate', () => {
    const event = stubEvent({ startDate: new Date(now - 2 * HOUR), endDate: new Date(now - HOUR) });
    expect(computeDisplayStatus(event, now)).toBe('COMPLETED');
  });

  it('ONGOING when now is between startDate and endDate inclusive of the start boundary', () => {
    const event = stubEvent({ startDate: now, endDate: new Date(now.getTime() + HOUR) });
    expect(computeDisplayStatus(event, now)).toBe('ONGOING'); // now === startDate, boundary case
  });

  it('REGISTRATION_CLOSED once the deadline has strictly passed but the event has not started', () => {
    const event = stubEvent({
      startDate: new Date(now.getTime() + HOUR),
      endDate: new Date(now.getTime() + 2 * HOUR),
      registrationDeadline: new Date(now.getTime() - 1),
    });
    expect(computeDisplayStatus(event, now)).toBe('REGISTRATION_CLOSED');
  });

  it('REGISTRATION_OPEN at the exact deadline instant (boundary is inclusive)', () => {
    const event = stubEvent({
      startDate: new Date(now.getTime() + HOUR),
      endDate: new Date(now.getTime() + 2 * HOUR),
      registrationDeadline: now,
    });
    expect(computeDisplayStatus(event, now)).toBe('REGISTRATION_OPEN');
  });

  it('REGISTRATION_OPEN with no deadline set at all', () => {
    const event = stubEvent({ startDate: new Date(now.getTime() + HOUR), endDate: new Date(now.getTime() + 2 * HOUR) });
    expect(computeDisplayStatus(event, now)).toBe('REGISTRATION_OPEN');
  });
});

describe('computeDisplayStatus uses the real start/end instants, not the calendar date', () => {
  // An event dated today whose start time is 18:00 (in the event's timezone) — startDate/endDate
  // are today's UTC midnight, which is what used to make it look ongoing/completed all day.
  const dateOnlyMidnight = new Date('2026-09-24T00:00:00.000Z');
  const sameDayEvening = stubEvent({
    startDate: dateOnlyMidnight,
    endDate: dateOnlyMidnight,
    startsAt: new Date('2026-09-24T12:30:00.000Z'), // 18:00 IST
    endsAt: new Date('2026-09-24T15:00:00.000Z'), // 20:30 IST
  });

  it('is still open at 10:00 for a 6 PM start the same day', () => {
    expect(computeDisplayStatus(sameDayEvening, new Date('2026-09-24T04:30:00.000Z'))).toBe('REGISTRATION_OPEN');
  });

  it('is ONGOING once the start time has passed', () => {
    expect(computeDisplayStatus(sameDayEvening, new Date('2026-09-24T12:30:00.000Z'))).toBe('ONGOING');
    expect(computeDisplayStatus(sameDayEvening, new Date('2026-09-24T14:00:00.000Z'))).toBe('ONGOING');
  });

  it('is COMPLETED only after the end time', () => {
    expect(computeDisplayStatus(sameDayEvening, new Date('2026-09-24T15:00:00.001Z'))).toBe('COMPLETED');
  });

  it('closes registration at registrationClosesAt, and prefers it over the date-only deadline', () => {
    const closesAt = new Date('2026-09-23T18:29:59.999Z'); // end of 23 Sep in IST
    const event = {
      ...sameDayEvening,
      registrationDeadline: new Date('2026-09-23T00:00:00.000Z'), // the old date-only meaning: already past
      registrationClosesAt: closesAt,
    };
    expect(computeDisplayStatus(event, new Date('2026-09-23T12:00:00.000Z'))).toBe('REGISTRATION_OPEN');
    expect(computeDisplayStatus(event, closesAt)).toBe('REGISTRATION_OPEN'); // boundary is inclusive
    expect(computeDisplayStatus(event, new Date(closesAt.getTime() + 1))).toBe('REGISTRATION_CLOSED');
  });
});

describe('statusFilterToQuery matches computeDisplayStatus (drift guard, live DB)', () => {
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  // publishEvent rejects a start in the past and a real request can never produce an end before
  // the start, so build a consistent future window, publish, then move the whole window in one save
  // to simulate an event that is now ongoing/completed/etc.
  async function makeBackdatedPublishedEvent(organization, owner, { startDate, endDate, registrationDeadline }) {
    const event = await makeEvent({
      organization,
      createdBy: owner,
      overrides: { startDate: new Date(Date.now() + HOUR), endDate: new Date(Date.now() + 2 * HOUR) },
    });
    await publishEvent(event);
    Object.assign(event, { startDate, endDate, registrationDeadline: registrationDeadline ?? null });
    await event.save();
    return event;
  }

  it('a live query for each derived status returns exactly the events computeDisplayStatus independently tags with it', async () => {
    const { organization, owner } = await makeOrg();
    const real = new Date();

    const draft = await makeEvent({ organization, createdBy: owner, overrides: { title: 'Draft' } });
    const ongoing = await makeBackdatedPublishedEvent(organization, owner, {
      startDate: new Date(real.getTime() - HOUR),
      endDate: new Date(real.getTime() + HOUR),
    });
    const completed = await makeBackdatedPublishedEvent(organization, owner, {
      startDate: new Date(real.getTime() - 3 * HOUR),
      endDate: new Date(real.getTime() - HOUR),
    });
    const open = await makeBackdatedPublishedEvent(organization, owner, {
      startDate: new Date(real.getTime() + HOUR),
      endDate: new Date(real.getTime() + 2 * HOUR),
    });
    const closed = await makeBackdatedPublishedEvent(organization, owner, {
      startDate: new Date(real.getTime() + HOUR),
      endDate: new Date(real.getTime() + 2 * HOUR),
      registrationDeadline: new Date(real.getTime() - 1),
    });

    const cases = [
      ['DRAFT', draft],
      ['ONGOING', ongoing],
      ['COMPLETED', completed],
      ['REGISTRATION_OPEN', open],
      ['REGISTRATION_CLOSED', closed],
    ];

    for (const [status, expectedEvent] of cases) {
      const fresh = await Event.findById(expectedEvent._id);
      expect(computeDisplayStatus(fresh, real)).toBe(status);

      const query = { organization: organization._id, ...statusFilterToQuery(status, real) };
      const matched = await Event.find(query).select('_id');
      const matchedIds = matched.map((e) => e._id.toString());
      expect(matchedIds).toContain(expectedEvent._id.toString());

      const otherIds = cases.filter(([s]) => s !== status).map(([, e]) => e._id.toString());
      for (const otherId of otherIds) expect(matchedIds).not.toContain(otherId);
    }
  });

  it('UPCOMING covers every published event that has not started (open and closed), and nothing else', async () => {
    const { organization, owner } = await makeOrg();
    const real = new Date();

    const draft = await makeEvent({ organization, createdBy: owner });
    const ongoing = await makeBackdatedPublishedEvent(organization, owner, {
      startDate: new Date(real.getTime() - HOUR),
      endDate: new Date(real.getTime() + HOUR),
    });
    const completed = await makeBackdatedPublishedEvent(organization, owner, {
      startDate: new Date(real.getTime() - 3 * HOUR),
      endDate: new Date(real.getTime() - HOUR),
    });
    const open = await makeBackdatedPublishedEvent(organization, owner, {
      startDate: new Date(real.getTime() + HOUR),
      endDate: new Date(real.getTime() + 2 * HOUR),
    });
    const closed = await makeBackdatedPublishedEvent(organization, owner, {
      startDate: new Date(real.getTime() + HOUR),
      endDate: new Date(real.getTime() + 2 * HOUR),
      registrationDeadline: new Date(real.getTime() - 1),
    });

    const matched = await Event.find({ organization: organization._id, ...statusFilterToQuery('UPCOMING', real) }).select('_id');
    const ids = matched.map((e) => e._id.toString()).sort();
    expect(ids).toEqual([open._id.toString(), closed._id.toString()].sort());
    for (const excluded of [draft, ongoing, completed]) expect(ids).not.toContain(excluded._id.toString());
  });

  it('agrees with computeDisplayStatus for an event dated today whose start time is later today', async () => {
    const { organization, owner } = await makeOrg();
    const real = new Date();
    const utcDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const start = new Date(real.getTime() + 2 * HOUR);
    const end = new Date(real.getTime() + 3 * HOUR);

    // Picked calendar dates + wall-clock times in UTC, exactly as the wizard would submit them.
    const event = await makeEvent({
      organization,
      createdBy: owner,
      overrides: {
        startDate: utcDay(start),
        endDate: utcDay(end),
        startTime: start.toISOString().slice(11, 16),
        endTime: end.toISOString().slice(11, 16),
        timezone: 'UTC',
      },
    });
    await publishEvent(event);

    const fresh = await Event.findById(event._id);
    expect(computeDisplayStatus(fresh, real)).toBe('REGISTRATION_OPEN');
    const matched = await Event.find({ organization: organization._id, ...statusFilterToQuery('REGISTRATION_OPEN', real) }).select('_id');
    expect(matched.map((e) => e._id.toString())).toContain(event._id.toString());
    const ongoingMatch = await Event.find({ organization: organization._id, ...statusFilterToQuery('ONGOING', real) }).select('_id');
    expect(ongoingMatch.map((e) => e._id.toString())).not.toContain(event._id.toString());
  });
});
