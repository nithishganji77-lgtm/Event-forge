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
