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

describe('statusFilterToQuery matches computeDisplayStatus (drift guard, live DB)', () => {
  beforeAll(connectTestDb);
  afterEach(clearTestDb);
  afterAll(disconnectTestDb);

  async function makeBackdatedPublishedEvent(organization, owner, overrides) {
    // publishEvent itself rejects a past startDate, so publish with a valid future date first,
    // then backdate directly to simulate an event that's now ongoing/completed/etc.
    const event = await makeEvent({
      organization,
      createdBy: owner,
      overrides: { ...overrides, startDate: new Date(Date.now() + HOUR) },
    });
    await publishEvent(event);
    Object.assign(event, overrides);
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
});
