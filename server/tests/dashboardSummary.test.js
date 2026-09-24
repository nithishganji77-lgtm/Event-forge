import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeUser, makeOrg, makeMember, makeEvent, makePublishedEvent } from './helpers/factories.js';
import { getDashboardSummary } from '../src/services/analytics.service.js';
import { Event } from '../src/models/Event.js';
import { EventRegistration } from '../src/models/EventRegistration.js';
import { Invite } from '../src/models/Invite.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { ROLES } from '../src/constants/roles.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

// Fixed clock so month boundaries and "next 7 days" don't depend on when the suite runs. Event
// dates below are exact instants (rule 2 in utils/eventTime.js), so startsAt equals startDate.
const NOW = new Date('2026-09-24T10:00:00.000Z');
const at = (iso) => new Date(iso);

// makeEvent goes through the real service (slug, validation, derived instants) but only creates
// drafts, and publishEvent rejects a start before the *real* now — so publish with a raw write.
async function publishedEvent(args) {
  const event = await makeEvent(args);
  await Event.updateOne({ _id: event._id }, { $set: { status: 'PUBLISHED' } });
  return event;
}

async function loginAgent(email, password = 'Test@1234') {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password });
  return agent;
}

async function orgWithOrganizer() {
  const { organization, owner } = await makeOrg();
  const organizer = await makeUser({ email: 'organizer@example.com' });
  await makeMember({ organization, user: organizer, role: ROLES.ORGANIZER });
  return { organization, owner, organizer };
}

const summaryFor = (organization, scopeToUserId, extra = {}) =>
  getDashboardSummary(organization._id, {
    scopeToUserId,
    canManageInvites: true,
    timeZone: 'UTC',
    now: NOW,
    ...extra,
  });

describe('getDashboardSummary scoping', () => {
  async function seedEvents({ organization, owner, organizer }) {
    const start = (iso) => ({ startDate: at(iso), endDate: at(iso.replace('10:00', '12:00')) });
    await publishedEvent({ organization, createdBy: owner, overrides: { title: 'Owner soon', ...start('2026-09-27T10:00:00.000Z') } });
    await publishedEvent({ organization, createdBy: owner, overrides: { title: 'Owner later', ...start('2026-10-20T10:00:00.000Z') } });
    await publishedEvent({ organization, createdBy: organizer, overrides: { title: 'Organizer soon', ...start('2026-09-28T10:00:00.000Z') } });
    await publishedEvent({ organization, createdBy: owner, overrides: { title: 'Already over', ...start('2026-09-01T10:00:00.000Z') } });
    await makeEvent({ organization, createdBy: organizer, overrides: { title: 'Organizer draft', ...start('2026-11-01T10:00:00.000Z') } });
    await makeEvent({ organization, createdBy: owner, overrides: { title: 'Owner draft', ...start('2026-11-02T10:00:00.000Z') } });
  }

  it('an admin (no scope) sees the whole organization', async () => {
    const ctx = await orgWithOrganizer();
    await seedEvents(ctx);

    const s = await summaryFor(ctx.organization, null);
    expect(s.upcomingEvents).toBe(3); // the completed one is excluded
    expect(s.startingNext7Days).toBe(2); // 27 Sep and 28 Sep, not 20 Oct
    expect(s.pendingActions.drafts).toBe(2);
  });

  it('an organizer sees only events they created or organize', async () => {
    const ctx = await orgWithOrganizer();
    await seedEvents(ctx);

    const s = await summaryFor(ctx.organization, ctx.organizer._id);
    expect(s.upcomingEvents).toBe(1);
    expect(s.startingNext7Days).toBe(1);
    expect(s.pendingActions.drafts).toBe(1);
  });

  it('counts an event the organizer is only listed on as theirs', async () => {
    const ctx = await orgWithOrganizer();
    await publishedEvent({
      organization: ctx.organization,
      createdBy: ctx.owner,
      overrides: { startDate: at('2026-09-30T10:00:00.000Z'), endDate: at('2026-09-30T12:00:00.000Z'), organizers: [ctx.organizer._id] },
    });
    const s = await summaryFor(ctx.organization, ctx.organizer._id);
    expect(s.upcomingEvents).toBe(1);
  });

  it("never counts another organization's events or registrations", async () => {
    const ctx = await orgWithOrganizer();
    await seedEvents(ctx);
    const before = await summaryFor(ctx.organization, null);

    const other = await makeOrg();
    const foreign = await publishedEvent({
      organization: other.organization,
      createdBy: other.owner,
      overrides: { startDate: at('2026-09-27T10:00:00.000Z'), endDate: at('2026-09-27T12:00:00.000Z') },
    });
    await EventRegistration.create({
      event: foreign._id,
      user: other.owner._id,
      organization: other.organization._id,
      status: 'REGISTERED',
      registeredAt: at('2026-09-10T10:00:00.000Z'),
    });

    expect(await summaryFor(ctx.organization, null)).toEqual(before);
  });
});

describe('getDashboardSummary month windows follow the caller timezone', () => {
  async function seedMonthEdges() {
    const { organization, owner } = await makeOrg();
    const make = (title, iso) =>
      publishedEvent({
        organization,
        createdBy: owner,
        overrides: { title, startDate: at(iso), endDate: new Date(at(iso).getTime() + 60 * 60 * 1000) },
      });
    await make('IST 1 Sep 00:30 (still 31 Aug in UTC)', '2026-08-31T19:00:00.000Z');
    await make('Mid September', '2026-09-15T10:00:00.000Z');
    await make('IST 1 Oct 00:30 (still 30 Sep in UTC)', '2026-09-30T19:00:00.000Z');
    await make('Mid August', '2026-08-15T10:00:00.000Z');
    return organization;
  }

  it('counts events per month in the requested zone', async () => {
    const organization = await seedMonthEdges();

    const ist = await summaryFor(organization, null, { timeZone: 'Asia/Kolkata' });
    expect([ist.eventsThisMonth, ist.eventsLastMonth]).toEqual([2, 1]);

    const utc = await summaryFor(organization, null, { timeZone: 'UTC' });
    expect([utc.eventsThisMonth, utc.eventsLastMonth]).toEqual([2, 2]);
  });
});

describe('getDashboardSummary registrations', () => {
  it('counts registered attendees and this/last month sign-ups, ignoring waitlisted and cancelled', async () => {
    const { organization, owner } = await makeOrg();
    const event = await publishedEvent({
      organization,
      createdBy: owner,
      overrides: { startDate: at('2026-10-10T10:00:00.000Z'), endDate: at('2026-10-10T12:00:00.000Z'), capacity: 50 },
    });

    const rows = [
      ['REGISTERED', '2026-09-10T10:00:00.000Z'],
      ['REGISTERED', '2026-09-20T10:00:00.000Z'],
      ['REGISTERED', '2026-08-10T10:00:00.000Z'],
      ['WAITLISTED', '2026-09-12T10:00:00.000Z'],
      ['CANCELLED', '2026-09-13T10:00:00.000Z'],
    ];
    for (const [status, registeredAt] of rows) {
      // eslint-disable-next-line no-await-in-loop
      const user = await makeUser();
      // eslint-disable-next-line no-await-in-loop
      await EventRegistration.create({
        event: event._id,
        user: user._id,
        organization: organization._id,
        status,
        registeredAt: at(registeredAt),
      });
    }

    const s = await summaryFor(organization, null);
    expect(s.registeredAttendees).toBe(3);
    expect(s.newRegistrationsThisMonth).toBe(2);
    expect(s.newRegistrationsLastMonth).toBe(1);
  });
});

describe('getDashboardSummary pending actions', () => {
  async function makeInvite(organization, owner, { email, status = 'PENDING', expiresAt }) {
    return Invite.create({
      organization: organization._id,
      email,
      role: ROLES.EMPLOYEE,
      invitedBy: owner._id,
      tokenHash: `hash-${email}`,
      status,
      expiresAt,
    });
  }

  it('adds pending, unexpired invites to drafts — but only when the caller can manage invites', async () => {
    const { organization, owner } = await makeOrg();
    await makeEvent({ organization, createdBy: owner, overrides: { title: 'A draft' } });
    await makeInvite(organization, owner, { email: 'live@example.com', expiresAt: at('2026-10-01T00:00:00.000Z') });
    await makeInvite(organization, owner, { email: 'expired@example.com', expiresAt: at('2026-09-01T00:00:00.000Z') });
    await makeInvite(organization, owner, { email: 'revoked@example.com', status: 'REVOKED', expiresAt: at('2026-10-01T00:00:00.000Z') });

    const other = await makeOrg();
    await makeInvite(other.organization, other.owner, { email: 'elsewhere@example.com', expiresAt: at('2026-10-01T00:00:00.000Z') });

    const admin = await summaryFor(organization, null, { canManageInvites: true });
    expect(admin.pendingActions).toEqual({ total: 2, drafts: 1, pendingInvites: 1 });

    const organizerView = await summaryFor(organization, null, { canManageInvites: false });
    expect(organizerView.pendingActions).toEqual({ total: 1, drafts: 1, pendingInvites: null });
  });
});

describe('GET /organizations/:orgId/analytics/dashboard', () => {
  it('rejects an unauthenticated request', async () => {
    const { organization } = await makeOrg();
    const res = await request(app).get(`/api/v1/organizations/${organization._id}/analytics/dashboard`);
    expect(res.status).toBe(401);
  });

  it('forbids an EMPLOYEE (no ANALYTICS_READ)', async () => {
    const { organization } = await makeOrg();
    const employee = await makeUser({ email: 'employee@example.com' });
    await makeMember({ organization, user: employee, role: ROLES.EMPLOYEE });

    const agent = await loginAgent('employee@example.com');
    const res = await agent.get(`/api/v1/organizations/${organization._id}/analytics/dashboard`);
    expect(res.status).toBe(403);
  });

  it('scopes an organizer to their own events and hides invite counts; an admin sees both', async () => {
    const { organization, owner, organizer } = await orgWithOrganizer();
    await makePublishedEvent({ organization, createdBy: owner, overrides: { title: 'Owner event' } });
    await makePublishedEvent({ organization, createdBy: organizer, overrides: { title: 'Organizer event' } });

    const organizerAgent = await loginAgent('organizer@example.com');
    const organizerRes = await organizerAgent.get(`/api/v1/organizations/${organization._id}/analytics/dashboard?tz=Asia/Kolkata`);
    expect(organizerRes.status).toBe(200);
    expect(organizerRes.body.data.summary.upcomingEvents).toBe(1);
    expect(organizerRes.body.data.summary.pendingActions.pendingInvites).toBeNull();

    const adminAgent = await loginAgent(owner.email);
    const adminRes = await adminAgent.get(`/api/v1/organizations/${organization._id}/analytics/dashboard?tz=Asia/Kolkata`);
    expect(adminRes.body.data.summary.upcomingEvents).toBe(2);
    expect(adminRes.body.data.summary.pendingActions.pendingInvites).toBe(0);
  });

  it('rejects an unknown timezone', async () => {
    const { organization, owner } = await makeOrg();
    const agent = await loginAgent(owner.email);
    const res = await agent.get(`/api/v1/organizations/${organization._id}/analytics/dashboard?tz=Not/AZone`);
    expect(res.status).toBe(400);
  });
});

describe('audit rows carry the event title', () => {
  it('denormalises eventId/eventTitle onto publish and registration rows', async () => {
    const { organization, owner } = await makeOrg();
    const employee = await makeUser({ email: 'employee@example.com' });
    await makeMember({ organization, user: employee, role: ROLES.EMPLOYEE });
    const event = await makeEvent({ organization, createdBy: owner, overrides: { title: 'Sreeman Pelli' } });

    const ownerAgent = await loginAgent(owner.email);
    expect((await ownerAgent.post(`/api/v1/events/${event._id}/publish`)).status).toBe(200);

    const employeeAgent = await loginAgent('employee@example.com');
    expect((await employeeAgent.post(`/api/v1/events/${event._id}/register`)).status).toBe(201);

    const published = await AuditLog.findOne({ action: 'EVENT_PUBLISHED' }).lean();
    expect(published.metadata).toMatchObject({ eventTitle: 'Sreeman Pelli' });
    expect(String(published.metadata.eventId)).toBe(String(event._id));

    // Registration rows point at a registration id, so this metadata is the only link to the event.
    const registered = await AuditLog.findOne({ action: 'REGISTRATION_CREATED' }).lean();
    expect(registered.entityType).toBe('EventRegistration');
    expect(registered.metadata).toMatchObject({ eventTitle: 'Sreeman Pelli' });
    expect(String(registered.metadata.eventId)).toBe(String(event._id));
  });
});
