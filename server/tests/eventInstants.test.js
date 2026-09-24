import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeOrg, makeEvent, makePublishedEvent } from './helpers/factories.js';
import { publishEvent, updateEvent } from '../src/services/event.service.js';
import { backfillEventTimes } from '../src/services/eventBackfill.service.js';
import { runDeadlineReminderTick } from '../src/jobs/deadlineReminder.job.js';
import { Event } from '../src/models/Event.js';
import { Notification } from '../src/models/Notification.js';
import { NOTIFICATION_TYPES } from '../src/constants/notificationTypes.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

const HOUR = 60 * 60 * 1000;
const utcMidnight = (yyyyMmDd) => new Date(`${yyyyMmDd}T00:00:00.000Z`);
const utcDayOf = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

describe('Event model derives its real start/end instants', () => {
  it('computes startsAt / endsAt / registrationClosesAt on create from date + time + timezone', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makeEvent({
      organization,
      createdBy: owner,
      overrides: {
        startDate: utcMidnight('2026-09-24'),
        endDate: utcMidnight('2026-09-24'),
        startTime: '18:00',
        endTime: '20:30',
        timezone: 'Asia/Kolkata',
        registrationDeadline: utcMidnight('2026-09-23'),
      },
    });
    expect(event.startsAt.toISOString()).toBe('2026-09-24T12:30:00.000Z');
    expect(event.endsAt.toISOString()).toBe('2026-09-24T15:00:00.000Z');
    expect(event.registrationClosesAt.toISOString()).toBe('2026-09-23T18:29:59.999Z');
  });

  it('recomputes when a source field changes (updateEvent goes through doc.save)', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makeEvent({
      organization,
      createdBy: owner,
      overrides: {
        startDate: utcMidnight('2026-09-24'),
        endDate: utcMidnight('2026-09-24'),
        startTime: '18:00',
        timezone: 'Asia/Kolkata',
      },
    });
    await updateEvent(event, { startTime: '19:15' });
    expect(event.startsAt.toISOString()).toBe('2026-09-24T13:45:00.000Z');
  });

  it('leaves the instants alone on an unrelated save, even for a legacy row with a bad timezone', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner });
    const originalStartsAt = event.startsAt.getTime();

    // Simulate a row written before the timezone was validated.
    await Event.updateOne({ _id: event._id }, { $set: { timezone: 'Not/AZone' } });
    const legacy = await Event.findById(event._id);
    legacy.status = 'CANCELLED';
    await expect(legacy.save()).resolves.toBeDefined(); // timezone unmodified -> not re-validated
    expect(legacy.startsAt.getTime()).toBe(originalStartsAt);
  });

  it('rejects an end time before the start time on the same day', async () => {
    const { organization, owner } = await makeOrg();
    await expect(
      makeEvent({
        organization,
        createdBy: owner,
        overrides: {
          startDate: utcMidnight('2026-09-24'),
          endDate: utcMidnight('2026-09-24'),
          startTime: '18:00',
          endTime: '17:00',
          timezone: 'Asia/Kolkata',
        },
      })
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });

  it('rejects an unknown timezone', async () => {
    const { organization, owner } = await makeOrg();
    await expect(
      makeEvent({ organization, createdBy: owner, overrides: { timezone: 'Not/AZone' } })
    ).rejects.toMatchObject({ name: 'ValidationError' });
  });
});

describe('publishEvent compares the real start instant', () => {
  // Picked date + wall-clock time in UTC, exactly as the wizard submits them.
  function sameDayOverrides(target) {
    return {
      startDate: utcDayOf(target),
      endDate: utcDayOf(target),
      startTime: target.toISOString().slice(11, 16),
      endTime: '',
      timezone: 'UTC',
    };
  }

  it('publishes a same-day event whose start time is still ahead (used to be rejected)', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makeEvent({
      organization,
      createdBy: owner,
      overrides: sameDayOverrides(new Date(Date.now() + 2 * HOUR)),
    });
    const published = await publishEvent(event);
    expect(published.status).toBe('PUBLISHED');
  });

  it('rejects a same-day event whose start time has already passed', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makeEvent({
      organization,
      createdBy: owner,
      overrides: sameDayOverrides(new Date(Date.now() - 2 * HOUR)),
    });
    await expect(publishEvent(event)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('backfillEventTimes', () => {
  async function insertLegacyEvent({ organization, owner, overrides = {} }) {
    // Raw insert: this is what a row written before startsAt existed looks like.
    await Event.collection.insertOne({
      organization: organization._id,
      createdBy: owner._id,
      title: 'Legacy event',
      slug: `legacy-${Math.random().toString(36).slice(2, 8)}`,
      status: 'PUBLISHED',
      category: 'General',
      startDate: utcMidnight('2027-01-10'),
      endDate: utcMidnight('2027-01-10'),
      startTime: '09:00',
      endTime: '',
      timezone: 'Asia/Kolkata',
      capacity: 10,
      registrationDeadline: null,
      organizers: [],
      ...overrides,
    });
    return Event.findOne({ slug: overrides.slug ?? /^legacy-/ });
  }

  it('fills the derived fields on legacy rows, resets an unknown timezone, and is idempotent', async () => {
    const { organization, owner } = await makeOrg();
    const legacy = await insertLegacyEvent({ organization, owner, overrides: { timezone: 'Not/AZone' } });
    expect(legacy.startsAt).toBeUndefined();

    expect(await backfillEventTimes()).toEqual({ scanned: 1, updated: 1, failed: 0 });

    const fixed = await Event.findById(legacy._id);
    expect(fixed.timezone).toBe('Asia/Kolkata');
    expect(fixed.startsAt.toISOString()).toBe('2027-01-10T03:30:00.000Z'); // 09:00 IST
    expect(fixed.endsAt).toBeInstanceOf(Date);

    expect(await backfillEventTimes()).toEqual({ scanned: 0, updated: 0, failed: 0 });
  });

  it("ignores rows that aren't this app's events (another schema's lowercase status)", async () => {
    const { organization, owner } = await makeOrg();
    await insertLegacyEvent({ organization, owner, overrides: { slug: 'foreign-row', status: 'published' } });
    await insertLegacyEvent({ organization, owner, overrides: { slug: 'legacy-real' } });

    expect(await backfillEventTimes()).toEqual({ scanned: 1, updated: 1, failed: 0 });
  });

  it('counts a row it cannot repair as failed instead of aborting the rest', async () => {
    const { organization, owner } = await makeOrg();
    await insertLegacyEvent({
      organization,
      owner,
      overrides: { slug: 'legacy-broken', startDate: utcMidnight('2027-01-12'), endDate: utcMidnight('2027-01-10') },
    });
    await insertLegacyEvent({ organization, owner, overrides: { slug: 'legacy-fine' } });

    expect(await backfillEventTimes()).toEqual({ scanned: 2, updated: 1, failed: 1 });
  });
});

describe('deadline reminder cron uses the real closing instant', () => {
  it('reminds when registration closes later today — a date-only deadline of "today" would already look past', async () => {
    const { organization, owner } = await makeOrg();
    const now = new Date();
    const event = await makeEvent({
      organization,
      createdBy: owner,
      overrides: {
        startDate: utcDayOf(new Date(now.getTime() + 3 * 24 * HOUR)),
        endDate: utcDayOf(new Date(now.getTime() + 3 * 24 * HOUR)),
        startTime: '10:00',
        timezone: 'UTC',
        registrationDeadline: utcDayOf(now), // date-only: midnight UTC today, i.e. already in the past
      },
    });
    await publishEvent(event);
    expect(event.registrationClosesAt.getTime()).toBeGreaterThan(now.getTime()); // end of today UTC

    await runDeadlineReminderTick();

    const notified = await Notification.countDocuments({
      recipient: owner._id,
      type: NOTIFICATION_TYPES.DEADLINE_APPROACHING,
    });
    expect(notified).toBe(1);
    expect((await Event.findById(event._id)).deadlineReminderSentAt).toBeInstanceOf(Date);

    await runDeadlineReminderTick(); // idempotent
    expect(
      await Notification.countDocuments({ recipient: owner._id, type: NOTIFICATION_TYPES.DEADLINE_APPROACHING })
    ).toBe(1);
  });
});
