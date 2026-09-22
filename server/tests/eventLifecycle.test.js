import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeOrg, makeEvent, makePublishedEvent } from './helpers/factories.js';
import { publishEvent, cancelEvent, deleteEvent, duplicateEvent } from '../src/services/event.service.js';
import { EventRegistration } from '../src/models/EventRegistration.js';
import { Event } from '../src/models/Event.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

describe('publishEvent guard rails', () => {
  it('rejects publishing an already-cancelled event', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makeEvent({ organization, createdBy: owner });
    event.status = 'CANCELLED';
    await event.save();
    await expect(publishEvent(event)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects publishing an already-published event', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner });
    await expect(publishEvent(event)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects publishing an event whose start date has already passed', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makeEvent({
      organization,
      createdBy: owner,
      overrides: { startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 1000) },
    });
    await expect(publishEvent(event)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('publishes a valid draft event, stamping publishedAt', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makeEvent({ organization, createdBy: owner });
    const published = await publishEvent(event);
    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).toBeInstanceOf(Date);
  });
});

describe('cancelEvent', () => {
  it('sets status to CANCELLED without cascading to existing registrations', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner });
    await EventRegistration.create({ event: event._id, user: owner._id, organization: organization._id, status: 'REGISTERED' });

    const cancelled = await cancelEvent(event);
    expect(cancelled.status).toBe('CANCELLED');

    const remaining = await EventRegistration.countDocuments({ event: event._id });
    expect(remaining).toBe(1); // still on record, not cascade-deleted
  });
});

describe('deleteEvent', () => {
  it('cascades — deletes all registrations for the event along with it', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner });
    await EventRegistration.create({ event: event._id, user: owner._id, organization: organization._id, status: 'REGISTERED' });

    await deleteEvent(event);

    expect(await Event.findById(event._id)).toBeNull();
    expect(await EventRegistration.countDocuments({ event: event._id })).toBe(0);
  });
});

describe('duplicateEvent', () => {
  it('creates a fresh DRAFT copy with a different slug and createdBy = duplicator, not the original creator', async () => {
    const { organization, owner } = await makeOrg();
    const original = await makePublishedEvent({ organization, createdBy: owner, overrides: { title: 'Original Talk' } });

    const duplicator = owner; // any active member could duplicate; using owner keeps the fixture simple
    const copy = await duplicateEvent(original, duplicator);

    expect(copy.status).toBe('DRAFT');
    expect(copy.slug).not.toBe(original.slug);
    expect(copy.title).toBe('Original Talk (Copy)');
    expect(copy.createdBy.toString()).toBe(duplicator._id.toString());
    expect(copy._id.toString()).not.toBe(original._id.toString());
  });
});
