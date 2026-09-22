import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeOrg, makeUser, makePublishedEvent } from './helpers/factories.js';
import { Notification } from '../src/models/Notification.js';
import { registerForEvent } from '../src/services/registration.service.js';
import { listMyEvents } from '../src/services/registration.service.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function loginAgent(email, password = 'Test@1234') {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password });
  return agent;
}

// z.coerce.boolean() runs the raw query string through JS's Boolean(...), and Boolean("false")
// is true (any non-empty string is truthy) — so ?unreadOnly=false was silently coerced to true,
// making the Notifications page's "ALL" tab only ever return unread notifications. Fixed with
// z.enum(['true','false']).transform(v => v === 'true').
describe('regression: GET /me/notifications?unreadOnly=false', () => {
  it('returns both read and unread notifications, not just unread ones', async () => {
    const { organization } = await makeOrg();
    const user = await makeUser({ email: 'notifme@example.com' });

    await Notification.create([
      { recipient: user._id, organization: organization._id, type: 'EVENT_PUBLISHED', title: 'Read one', message: 'x', read: true, readAt: new Date() },
      { recipient: user._id, organization: organization._id, type: 'EVENT_PUBLISHED', title: 'Unread one', message: 'x', read: false },
    ]);

    const agent = await loginAgent('notifme@example.com');
    const res = await agent.get('/api/v1/me/notifications?unreadOnly=false');

    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBe(2);
  });

  it('correctly returns only unread ones when unreadOnly=true', async () => {
    const { organization } = await makeOrg();
    const user = await makeUser({ email: 'notifme2@example.com' });

    await Notification.create([
      { recipient: user._id, organization: organization._id, type: 'EVENT_PUBLISHED', title: 'Read one', message: 'x', read: true, readAt: new Date() },
      { recipient: user._id, organization: organization._id, type: 'EVENT_PUBLISHED', title: 'Unread one', message: 'x', read: false },
    ]);

    const agent = await loginAgent('notifme2@example.com');
    const res = await agent.get('/api/v1/me/notifications?unreadOnly=true');

    expect(res.body.pagination.total).toBe(1);
  });
});

// listMyEvents populated each registration's `event` but never ran it through attachStats, so
// EventCard rendered undefined displayStatus/registeredCount specifically for "my events."
describe('regression: listMyEvents attachStats completeness', () => {
  it('every returned event has displayStatus/registeredCount/waitlistedCount populated, matching listEvents/getEventDetail', async () => {
    const { organization, owner } = await makeOrg();
    const event = await makePublishedEvent({ organization, createdBy: owner, overrides: { capacity: 5 } });
    const user = await makeUser();
    await registerForEvent(event, user);

    const results = await listMyEvents(user._id, [organization._id]);
    expect(results).toHaveLength(1);
    expect(results[0].event.displayStatus).toBe('REGISTRATION_OPEN');
    expect(results[0].event.registeredCount).toBe(1);
    expect(results[0].event.waitlistedCount).toBe(0);
  });
});
