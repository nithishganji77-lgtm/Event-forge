import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeOrg, makeUser, makeMember, makePublishedEvent } from './helpers/factories.js';
import { humanizeField } from '../src/utils/fieldLabels.js';
import { summarizeIssues } from '../src/middleware/validate.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

const DAY = 24 * 60 * 60 * 1000;

async function loginAgent(email, password = 'Test@1234') {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password });
  return agent;
}
const err = (res) => res.body.error;

describe('validation errors say what to fix, not "Invalid request data"', () => {
  it('names the field and what is wrong when a required field is missing', async () => {
    const { organization, owner } = await makeOrg();
    const agent = await loginAgent(owner.email);
    const res = await agent.post(`/api/v1/organizations/${organization._id}/events`).send({ startDate: '2027-01-01', endDate: '2027-01-01', capacity: 10 });

    expect(res.status).toBe(400);
    expect(err(res).message).toBe('Event name is required');
    expect(err(res).message).not.toMatch(/invalid request data/i);
    expect(err(res).details).toEqual([{ path: 'title', message: 'Event name is required' }]);
  });

  it('turns zod defaults into plain sentences for numbers, dates and enums', async () => {
    const { organization, owner } = await makeOrg();
    const agent = await loginAgent(owner.email);
    const res = await agent.post(`/api/v1/organizations/${organization._id}/events`).send({ title: 'Launch', startDate: 'not a date', endDate: '2027-01-01', capacity: 'lots' });

    const messages = err(res).details.map((d) => d.message);
    expect(messages).toContain('Start date must be a valid date');
    expect(messages).toContain('Capacity must be a number');
    expect(messages.join(' ')).not.toMatch(/Expected|received|Invalid date|nan/);
  });

  it('keeps a schema\'s own message over the generic one', async () => {
    const { organization, owner } = await makeOrg();
    const agent = await loginAgent(owner.email);
    const res = await agent.post(`/api/v1/organizations/${organization._id}/events`).send({
      title: 'Launch', startDate: '2027-01-02', endDate: '2027-01-01', capacity: 10,
    });
    expect(err(res).message).toBe('End date must be on or after the start date');
  });

  it('gives a length limit in words', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'x'.repeat(200), email: 'a@example.com', password: 'Test@1234' });
    expect(res.status).toBe(400);
    expect(err(res).message).toMatch(/Name must be at most \d+ characters/);
  });

  it('asks for a valid email in plain words', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'nope', password: 'x' });
    expect(err(res).message).toBe('Enter a valid email address');
  });

  it('lists a few problems in one sentence and counts the rest', async () => {
    expect(summarizeIssues([{ message: 'A' }, { message: 'B' }])).toBe('A; B');
    expect(summarizeIssues([{ message: 'A' }, { message: 'A' }])).toBe('A');
    expect(summarizeIssues(['A', 'B', 'C', 'D', 'E'].map((message) => ({ message })))).toBe('A; B; C; and 2 more');
  });

  it('does not say "Invalid id" for a bad link', async () => {
    const { owner } = await makeOrg();
    const agent = await loginAgent(owner.email);
    const res = await agent.get('/api/v1/events/not-an-id');
    expect(res.status).toBe(400);
    expect(err(res).message).toBe("That link isn't valid. Check the address and try again.");
  });
});

describe('field labels', () => {
  it.each([
    [['startDate'], 'Start date'],
    [['venue', 'mapUrl'], 'Map link'],
    [['venue', 'name'], 'Venue name'],
    [['organizers', 0], 'Organizers'],
    [['registrationDeadline'], 'Registration deadline'],
    [['someNewField'], 'Some new field'],
    [[], null],
  ])('%j -> %s', (path, label) => {
    expect(humanizeField(path)).toBe(label);
  });
});

describe('errors that used to be raw or a 500', () => {
  it('answers malformed JSON with a 400 and a plain sentence, not a 500', async () => {
    const res = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json').send('{"email": "a@b.co", ');
    expect(res.status).toBe(400);
    expect(err(res).message).toMatch(/couldn't read that request/i);
  });

  it('says "an account with this email already exists" and points at the email field', async () => {
    await makeUser({ email: 'taken@example.com' });
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'New Person', email: 'taken@example.com', password: 'Test@1234' });
    expect(res.status).toBe(409);
    expect(err(res).message).toMatch(/already exists/i);
    expect(err(res).details).toEqual([expect.objectContaining({ path: 'email' })]);
  });

  it('explains a too-large upload with the actual limit', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner });
    const agent = await loginAgent(owner.email);
    const res = await agent.post(`/api/v1/events/${event._id}/cover-image`).attach('coverImage', Buffer.alloc(6 * 1024 * 1024), { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(err(res).message).toBe('That image is too large. The limit is 5 MB.');
  });

  it('asks for a file when none is sent, and names the allowed types for a wrong one', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner });
    const agent = await loginAgent(owner.email);
    expect(err(await agent.post(`/api/v1/events/${event._id}/cover-image`)).message).toBe('Choose an image to upload.');
    const wrong = await agent.post(`/api/v1/events/${event._id}/cover-image`).attach('coverImage', Buffer.from('hi'), { filename: 'a.txt', contentType: 'text/plain' });
    expect(err(wrong).message).toBe('The cover image must be a JPEG, PNG or WebP file.');
  });
});

describe('everyday messages read as instructions', () => {
  it('asks an anonymous caller to sign in', async () => {
    const res = await request(app).get('/api/v1/organizations');
    expect(res.status).toBe(401);
    expect(err(res).message).toBe('Please sign in to continue.');
  });

  it('tells a non-member what happened, not just "forbidden"', async () => {
    const { organization } = await makeOrg();
    const outsider = await makeUser({ email: 'outsider@example.com' });
    const agent = await loginAgent(outsider.email);
    const res = await agent.get(`/api/v1/organizations/${organization._id}`);
    expect(res.status).toBe(403);
    expect(err(res).message).toBe('You are not a member of this organization');
  });

  it('tells a role without permission how to get it', async () => {
    const { organization } = await makeOrg();
    const employee = await makeUser({ email: 'emp@example.com' });
    await makeMember({ organization, user: employee, role: 'EMPLOYEE' });
    const agent = await loginAgent(employee.email);
    const res = await agent.get(`/api/v1/organizations/${organization._id}/analytics`);
    expect(res.status).toBe(403);
    expect(err(res).message).toMatch(/ask an organization admin/i);
  });

  it('does not leak the route or a stack in the sentence for an unknown URL', async () => {
    const res = await request(app).get('/api/v1/definitely/not/here');
    expect(res.status).toBe(404);
    expect(err(res).message).toBe("We couldn't find what you were looking for.");
    expect(err(res).details).toEqual({ method: 'GET', url: '/api/v1/definitely/not/here' });
  });

  it('publishing a started event explains what to change', async () => {
    const { organization, owner } = await makeOrg();
    const { makeEvent } = await import('./helpers/factories.js');
    const past = await makeEvent({ organization, createdBy: owner, overrides: { startDate: new Date(Date.now() - 2 * DAY), endDate: new Date(Date.now() - DAY) } });
    const agent = await loginAgent(owner.email);
    const res = await agent.post(`/api/v1/events/${past._id}/publish`);
    expect(res.status).toBe(400);
    expect(err(res).message).toBe("This event has already started, so it can't be published. Change its date or time first.");
  });

  it('the last-Super-Admin guard does not show an internal role name', async () => {
    const { organization, owner } = await makeOrg();
    const agent = await loginAgent(owner.email);
    const members = await agent.get(`/api/v1/organizations/${organization._id}/members`);
    const self = members.body.data.find((m) => m.user.email === owner.email);
    const res = await agent.patch(`/api/v1/organizations/${organization._id}/members/${self._id}`).send({ role: 'ORG_ADMIN' });
    expect(res.status).toBe(409);
    expect(err(res).message).toMatch(/at least one Super Admin/);
    expect(err(res).message).not.toMatch(/SUPER_ADMIN/);
  });
});
