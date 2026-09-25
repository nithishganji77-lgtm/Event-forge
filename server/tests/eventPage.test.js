import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeOrg, makeUser, makeMember, makePublishedEvent } from './helpers/factories.js';
import { listRegistrations, registerForEvent, cancelRegistration } from '../src/services/registration.service.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

const DAY = 24 * 60 * 60 * 1000;

async function loginAgent(email, password = 'Test@1234') {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password });
  return agent;
}

const eventBody = (overrides = {}) => ({
  title: 'Launch party',
  startDate: new Date(Date.now() + 5 * DAY).toISOString(),
  endDate: new Date(Date.now() + 5 * DAY + 3_600_000).toISOString(),
  capacity: 20,
  ...overrides,
});

describe('GET /events/:id includes the people behind the event', () => {
  it('returns the creator first, then each organizer, as profiles with a role', async () => {
    const { organization, owner } = await makeOrg();
    const organizer = await makeUser({ name: 'Arjun Mehta', email: 'arjun@example.com' });
    await makeMember({ organization, user: organizer, role: 'ORGANIZER' });
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { organizers: [organizer._id] } });

    const agent = await loginAgent(owner.email);
    const res = await agent.get(`/api/v1/events/${event._id}`);

    expect(res.status).toBe(200);
    const { people } = res.body.data.event;
    expect(people.map((p) => [p.name, p.role])).toEqual([[owner.name, 'CREATOR'], ['Arjun Mehta', 'ORGANIZER']]);
    expect(people[1]).toMatchObject({ email: 'arjun@example.com' });
  });

  it('exposes only name, email and avatar of a person, never credentials', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner });
    const agent = await loginAgent(owner.email);
    const { people } = (await agent.get(`/api/v1/events/${event._id}`)).body.data.event;

    expect(Object.keys(people[0]).sort()).toEqual(['_id', 'email', 'name', 'role'].concat(people[0].avatar !== undefined ? ['avatar'] : []).sort());
    expect(JSON.stringify(people)).not.toMatch(/password|refreshTokenVersion|googleId/);
  });

  it('lists someone once when they both created the event and are listed as an organizer', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { organizers: [owner._id] } });
    const agent = await loginAgent(owner.email);
    const { people } = (await agent.get(`/api/v1/events/${event._id}`)).body.data.event;
    expect(people).toHaveLength(1);
    expect(people[0].role).toBe('CREATOR');
  });

  it("still lets an employee open the page, and keeps createdBy / organizers as plain ids for the client's ownership checks", async () => {
    const { organization, owner } = await makeOrg();
    const employee = await makeUser({ email: 'employee@example.com' });
    await makeMember({ organization, user: employee, role: 'EMPLOYEE' });
    const event = await makePublishedEvent({ organization, createdBy: owner });

    const agent = await loginAgent('employee@example.com');
    const res = await agent.get(`/api/v1/events/${event._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.event.createdBy).toBe(String(owner._id));
    expect(res.body.data.event.organizers).toEqual([]);
  });
});

describe('links stored on an event must be http(s)', () => {
  async function ownerAgent() {
    const { organization, owner } = await makeOrg();
    return { organization, owner, agent: await loginAgent(owner.email) };
  }
  const create = (agent, organization, body) => agent.post(`/api/v1/organizations/${organization._id}/events`).send(body);

  it.each([
    ['javascript:', 'javascript:alert(document.cookie)'],
    ['data:', 'data:text/html,<script>alert(1)</script>'],
    ['ftp:', 'ftp://example.com/map'],
  ])('rejects a %s map link on create', async (_label, mapUrl) => {
    const { organization, agent } = await ownerAgent();
    const res = await create(agent, organization, eventBody({ venue: { name: 'Hall', mapUrl } }));
    expect(res.status).toBe(400);
  });

  it('accepts an https map link and an empty one', async () => {
    const { organization, agent } = await ownerAgent();
    expect((await create(agent, organization, eventBody({ venue: { name: 'Hall', mapUrl: 'https://maps.example.com/x' } }))).status).toBe(201);
    expect((await create(agent, organization, eventBody({ title: 'Second one', venue: { name: 'Hall', mapUrl: '' } }))).status).toBe(201);
  });

  it('rejects a javascript: map link on update too', async () => {
    const { organization, owner, agent } = await ownerAgent();
    const event = await makePublishedEvent({ organization, createdBy: owner });
    const res = await agent.patch(`/api/v1/events/${event._id}`).send({ venue: { name: 'Hall', mapUrl: 'javascript:alert(1)' } });
    expect(res.status).toBe(400);
  });

  it('rejects a data: cover image', async () => {
    const { organization, agent } = await ownerAgent();
    const res = await create(agent, organization, eventBody({ coverImage: 'data:image/svg+xml,<svg onload=alert(1)>' }));
    expect(res.status).toBe(400);
  });
});

describe('listRegistrations search', () => {
  async function setup() {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { capacity: 50 } });
    const people = {};
    for (const [key, name, email] of [
      ['meera', 'Meera Nair', 'meera.nair@example.com'],
      ['rohan', 'Rohan Desai', 'rohan@corp.test'],
      ['meena', 'Meena Kapoor', 'meena@example.com'],
    ]) {
      people[key] = await makeUser({ name, email });
      await makeMember({ organization, user: people[key], role: 'EMPLOYEE' });
      await registerForEvent(event, people[key]);
    }
    return { organization, owner, event, people };
  }
  const names = (result) => result.data.map((r) => r.user.name).sort();
  const page = { page: 1, limit: 20 };

  it('matches on name, case-insensitively', async () => {
    const { event } = await setup();
    expect(names(await listRegistrations(event._id, { ...page, search: 'meera' }))).toEqual(['Meera Nair']);
    expect(names(await listRegistrations(event._id, { ...page, search: 'ME' }))).toEqual(['Meena Kapoor', 'Meera Nair']);
  });

  it('matches on email', async () => {
    const { event } = await setup();
    expect(names(await listRegistrations(event._id, { ...page, search: 'corp.test' }))).toEqual(['Rohan Desai']);
  });

  it('treats the search as text, not a pattern', async () => {
    const { event } = await setup();
    const result = await listRegistrations(event._id, { ...page, search: '.*' });
    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("only finds people registered for THIS event, not everyone in the org", async () => {
    const { organization, owner, event } = await setup();
    const bystander = await makeUser({ name: 'Meera Bystander', email: 'bystander@example.com' });
    await makeMember({ organization, user: bystander, role: 'EMPLOYEE' });
    const other = await makePublishedEvent({ organization, createdBy: owner });
    await registerForEvent(other, bystander);

    expect(names(await listRegistrations(event._id, { ...page, search: 'meera' }))).toEqual(['Meera Nair']);
  });

  it('combines with the status filter and reports the filtered total', async () => {
    const { event, people } = await setup();
    await cancelRegistration(event, people.meera);

    const cancelled = await listRegistrations(event._id, { ...page, search: 'me', status: 'CANCELLED' });
    expect(names(cancelled)).toEqual(['Meera Nair']);
    expect(cancelled.total).toBe(1);
    const active = await listRegistrations(event._id, { ...page, search: 'me', status: 'REGISTERED' });
    expect(names(active)).toEqual(['Meena Kapoor']);
  });

  it('is unchanged without a search', async () => {
    const { event } = await setup();
    expect((await listRegistrations(event._id, page)).total).toBe(3);
  });
});
