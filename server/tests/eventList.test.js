import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeOrg, makeUser, makeMember, makePublishedEvent, makeEvent } from './helpers/factories.js';
import { listEvents } from '../src/services/event.service.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

const DAY = 24 * 60 * 60 * 1000;
const inDays = (n) => new Date(Date.now() + n * DAY);
const titles = (result) => result.data.map((e) => e.title);
const base = { page: 1, limit: 20 };

describe('listEvents filters compose instead of overwriting each other', () => {
  // Regression: Object.assign(filter, statusFilterToQuery(...)) let REGISTRATION_OPEN's own `$or`
  // replace the organizer `$or`, so "my open events" silently returned everyone's.
  it('honours an organizer filter together with status=REGISTRATION_OPEN', async () => {
    const { organization, owner } = await makeOrg();
    const other = await makeUser();
    await makeMember({ organization, user: other, role: 'ORGANIZER' });

    await makePublishedEvent({ organization, createdBy: owner, overrides: { title: 'Owner event' } });
    await makePublishedEvent({ organization, createdBy: other, overrides: { title: 'Other event' } });

    const mine = await listEvents(organization._id, { ...base, status: 'REGISTRATION_OPEN', organizer: other._id });
    expect(titles(mine)).toEqual(['Other event']);
    expect(mine.total).toBe(1);
  });

  it('honours a dateFrom window together with a status filter', async () => {
    const { organization, owner } = await makeOrg();
    await makePublishedEvent({ organization, createdBy: owner, overrides: { title: 'Soon', startDate: inDays(1) } });
    await makePublishedEvent({ organization, createdBy: owner, overrides: { title: 'Later', startDate: inDays(30) } });

    const result = await listEvents(organization._id, {
      ...base,
      status: 'REGISTRATION_OPEN',
      dateFrom: inDays(20),
    });
    expect(titles(result)).toEqual(['Later']);
  });

  it('UPCOMING returns published, not-yet-started events and excludes drafts', async () => {
    const { organization, owner } = await makeOrg();
    await makePublishedEvent({ organization, createdBy: owner, overrides: { title: 'Published' } });
    await makeEvent({ organization, createdBy: owner, overrides: { title: 'Draft' } });

    const result = await listEvents(organization._id, { ...base, status: 'UPCOMING' });
    expect(titles(result)).toEqual(['Published']);
  });
});

describe('listEvents ordering', () => {
  it('sorts by start ascending by default and descending on request', async () => {
    const { organization, owner } = await makeOrg();
    await makeEvent({ organization, createdBy: owner, overrides: { title: 'First', startDate: inDays(1) } });
    await makeEvent({ organization, createdBy: owner, overrides: { title: 'Second', startDate: inDays(2) } });
    await makeEvent({ organization, createdBy: owner, overrides: { title: 'Third', startDate: inDays(3) } });

    expect(titles(await listEvents(organization._id, base))).toEqual(['First', 'Second', 'Third']);
    expect(titles(await listEvents(organization._id, { ...base, sort: 'startsAt_desc' }))).toEqual([
      'Third',
      'Second',
      'First',
    ]);
  });

  it('breaks ties on _id so paging across identical start times never repeats or skips an event', async () => {
    const { organization, owner } = await makeOrg();
    const sameStart = inDays(5);
    for (const title of ['A', 'B', 'C']) {
      // eslint-disable-next-line no-await-in-loop
      await makeEvent({ organization, createdBy: owner, overrides: { title, startDate: sameStart } });
    }

    const seen = [];
    for (const page of [1, 2, 3]) {
      // eslint-disable-next-line no-await-in-loop
      const result = await listEvents(organization._id, { page, limit: 1 });
      seen.push(...titles(result));
    }
    expect(seen).toEqual(['A', 'B', 'C']);
  });
});
