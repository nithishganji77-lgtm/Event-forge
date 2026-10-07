import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeOrg, makeUser, makePublishedEvent } from './helpers/factories.js';
import { registerForEvent, cancelRegistration, markAttendance } from '../src/services/registration.service.js';
import { EventRegistration } from '../src/models/EventRegistration.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

describe('registerForEvent', () => {
  it('rejects when the event is not REGISTRATION_OPEN', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({
      organization,
      createdBy: owner,
      overrides: { startDate: new Date(Date.now() + 1000), endDate: new Date(Date.now() + 2000) },
    });
    event.status = 'CANCELLED';
    await event.save();
    const user = await makeUser();
    await expect(registerForEvent(event, user)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects a duplicate active registration', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { capacity: 5 } });
    const user = await makeUser();
    await registerForEvent(event, user);
    await expect(registerForEvent(event, user)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('assigns REGISTERED while under capacity and WAITLISTED once full', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { capacity: 1 } });
    const first = await makeUser({ email: 'first@example.com' });
    const second = await makeUser({ email: 'second@example.com' });

    const firstReg = await registerForEvent(event, first);
    const secondReg = await registerForEvent(event, second);

    expect(firstReg.status).toBe('REGISTERED');
    expect(secondReg.status).toBe('WAITLISTED');
  });

  it('never overbooks under real concurrent registration (capacity-race regression)', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { capacity: 3 } });
    const users = await Promise.all(
      Array.from({ length: 10 }, (_, i) => makeUser({ email: `racer${i}@example.com` }))
    );

    // All 10 requests start before any of them finish — the old count-then-write logic reads the
    // same pre-burst count for every one of them and lets far more than `capacity` in as
    // REGISTERED. The atomic findOneAndUpdate claim must cap it at exactly 3 regardless.
    const results = await Promise.all(users.map((user) => registerForEvent(event, user)));

    const registeredCount = results.filter((r) => r.status === 'REGISTERED').length;
    const waitlistedCount = results.filter((r) => r.status === 'WAITLISTED').length;
    expect(registeredCount).toBe(3);
    expect(waitlistedCount).toBe(7);

    // The reservation counter itself must agree with the real count of REGISTERED documents.
    const actualRegistered = await EventRegistration.countDocuments({
      event: event._id,
      status: 'REGISTERED',
    });
    expect(actualRegistered).toBe(3);
  });

  it('frees the slot for a brand-new registrant after a cancellation, not just whoever is already waitlisted', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { capacity: 1 } });
    const first = await makeUser({ email: 'first-cancel@example.com' });
    const second = await makeUser({ email: 'second-new@example.com' });

    const firstReg = await registerForEvent(event, first);
    expect(firstReg.status).toBe('REGISTERED');

    await cancelRegistration(event, first);

    // Nobody was on the waitlist when `first` cancelled, so this is a genuinely new registration,
    // not a promotion — it must still see the freed slot and land REGISTERED.
    const secondReg = await registerForEvent(event, second);
    expect(secondReg.status).toBe('REGISTERED');
  });
});

describe('cancel-then-re-register (non-partial unique index regression)', () => {
  it('reuses the same document instead of inserting a second one, and Mongo itself enforces this', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { capacity: 5 } });
    const user = await makeUser();

    await registerForEvent(event, user);
    expect(await EventRegistration.countDocuments({ event: event._id, user: user._id })).toBe(1);

    await cancelRegistration(event, user);
    expect(await EventRegistration.countDocuments({ event: event._id, user: user._id })).toBe(1);

    await registerForEvent(event, user);
    expect(await EventRegistration.countDocuments({ event: event._id, user: user._id })).toBe(1);
  });

  it('proves the {event,user} unique index is non-partial: a second doc for the same pair is rejected by Mongo directly, regardless of status', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { capacity: 5 } });
    const user = await makeUser();

    const first = await EventRegistration.create({ event: event._id, user: user._id, organization: organization._id, status: 'CANCELLED' });
    expect(first).toBeDefined();

    await expect(
      EventRegistration.create({ event: event._id, user: user._id, organization: organization._id, status: 'REGISTERED' })
    ).rejects.toMatchObject({ code: 11000 });
  });
});

describe('cancelRegistration auto-promotion', () => {
  it('promotes the oldest WAITLISTED registration only when the cancelled one wasRegistered', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { capacity: 1 } });
    const registered = await makeUser({ email: 'registered@example.com' });
    const waitlisted = await makeUser({ email: 'waitlisted@example.com' });

    await registerForEvent(event, registered);
    await registerForEvent(event, waitlisted);

    const { promoted } = await cancelRegistration(event, registered);
    expect(promoted).not.toBeNull();
    expect(promoted.user.toString()).toBe(waitlisted._id.toString());
    expect(promoted.status).toBe('REGISTERED');
  });

  it('does not promote anyone when the cancelled registration was itself only WAITLISTED', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { capacity: 1 } });
    const registered = await makeUser({ email: 'registered2@example.com' });
    const waitlisted = await makeUser({ email: 'waitlisted2@example.com' });

    await registerForEvent(event, registered);
    await registerForEvent(event, waitlisted);

    const { promoted } = await cancelRegistration(event, waitlisted);
    expect(promoted).toBeNull();
  });
});

describe('markAttendance', () => {
  it('rejects marking attendance on a non-REGISTERED (e.g. WAITLISTED) row', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { capacity: 1 } });
    const registered = await makeUser({ email: 'r@example.com' });
    const waitlisted = await makeUser({ email: 'w@example.com' });
    await registerForEvent(event, registered);
    const waitlistedReg = await registerForEvent(event, waitlisted);

    await expect(markAttendance(event._id, waitlistedReg._id, 'ATTENDED')).rejects.toMatchObject({ statusCode: 409 });
  });

  it('marks attendance on a REGISTERED row', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { capacity: 5 } });
    const user = await makeUser();
    const reg = await registerForEvent(event, user);

    const updated = await markAttendance(event._id, reg._id, 'ATTENDED');
    expect(updated.attendanceStatus).toBe('ATTENDED');
  });
});
