import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeUser, makeOrg, makeMember, makeEvent } from './helpers/factories.js';
import { getEffectivePermissions, PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../src/constants/permissions.js';
import { ROLES } from '../src/constants/roles.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function loginAgent(email, password = 'Test@1234') {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password });
  return agent;
}

describe('DEFAULT_ROLE_PERMISSIONS matrix', () => {
  it('grants SUPER_ADMIN every permission', () => {
    const effective = getEffectivePermissions(ROLES.SUPER_ADMIN);
    for (const p of Object.values(PERMISSIONS)) expect(effective.has(p)).toBe(true);
  });

  it('grants ORG_ADMIN every permission except ORGANIZATION_DELETE', () => {
    const effective = getEffectivePermissions(ROLES.ORG_ADMIN);
    expect(effective.has(PERMISSIONS.ORGANIZATION_DELETE)).toBe(false);
    expect(effective.has(PERMISSIONS.EVENT_DELETE)).toBe(true);
  });

  it('grants ORGANIZER exactly its documented 7-permission subset', () => {
    const effective = getEffectivePermissions(ROLES.ORGANIZER);
    expect([...effective].sort()).toEqual([...DEFAULT_ROLE_PERMISSIONS[ROLES.ORGANIZER]].sort());
    expect(effective.has(PERMISSIONS.MEMBER_DELETE)).toBe(false);
  });

  it('grants EMPLOYEE only EVENT_READ and MEMBER_READ', () => {
    const effective = getEffectivePermissions(ROLES.EMPLOYEE);
    expect([...effective].sort()).toEqual([PERMISSIONS.EVENT_READ, PERMISSIONS.MEMBER_READ].sort());
  });

  it('applies member.permissions as additive-only overrides', () => {
    const effective = getEffectivePermissions(ROLES.EMPLOYEE, [PERMISSIONS.EVENT_UPDATE]);
    expect(effective.has(PERMISSIONS.EVENT_UPDATE)).toBe(true);
    expect(effective.has(PERMISSIONS.EVENT_READ)).toBe(true); // base set still present
  });
});

describe('live-route permission enforcement', () => {
  it('lets an EMPLOYEE read events but rejects creating one (403, not just a hidden button)', async () => {
    const { organization, owner } = await makeOrg();
    const employee = await makeUser({ email: 'employee@example.com' });
    await makeMember({ organization, user: employee, role: ROLES.EMPLOYEE });

    const agent = await loginAgent('employee@example.com');
    const listRes = await agent.get(`/api/v1/organizations/${organization._id}/events`);
    expect(listRes.status).toBe(200);

    const createRes = await agent
      .post(`/api/v1/organizations/${organization._id}/events`)
      .send({ title: 'Nope', startDate: new Date(Date.now() + 86400000), endDate: new Date(Date.now() + 90000000), capacity: 10 });
    expect(createRes.status).toBe(403);
  });
});

// The single highest-value RBAC case: an additive permission grant is NOT the same as ownership.
describe('requireEventOwnership vs. an additive permission grant', () => {
  it('still 403s a non-owning EMPLOYEE even with a custom-granted EVENT_UPDATE permission', async () => {
    const { organization, owner } = await makeOrg();
    const organizer = await makeUser({ email: 'organizer@example.com' });
    await makeMember({ organization, user: organizer, role: ROLES.ORGANIZER });
    const event = await makeEvent({ organization, createdBy: organizer });

    const employee = await makeUser({ email: 'grantedemployee@example.com' });
    await makeMember({
      organization,
      user: employee,
      role: ROLES.EMPLOYEE,
      permissions: [PERMISSIONS.EVENT_UPDATE], // additive grant — NOT ownership
    });

    const agent = await loginAgent('grantedemployee@example.com');
    const res = await agent.patch(`/api/v1/events/${event._id}`).send({ title: 'Hijacked' });
    expect(res.status).toBe(403);
  });

  it('lets the actual owning ORGANIZER update their own event', async () => {
    const { organization } = await makeOrg();
    const organizer = await makeUser({ email: 'owner-organizer@example.com' });
    await makeMember({ organization, user: organizer, role: ROLES.ORGANIZER });
    const event = await makeEvent({ organization, createdBy: organizer });

    const agent = await loginAgent('owner-organizer@example.com');
    const res = await agent.patch(`/api/v1/events/${event._id}`).send({ title: 'Updated By Owner' });
    expect(res.status).toBe(200);
  });

  it('lets SUPER_ADMIN bypass ownership entirely, even for an event they did not create', async () => {
    const { organization, owner } = await makeOrg();
    const organizer = await makeUser({ email: 'someone-elses@example.com' });
    await makeMember({ organization, user: organizer, role: ROLES.ORGANIZER });
    const event = await makeEvent({ organization, createdBy: organizer });

    // `owner` is the org creator, i.e. SUPER_ADMIN, and did not create this event.
    const agent = await loginAgent(owner.email);
    const res = await agent.patch(`/api/v1/events/${event._id}`).send({ title: 'Admin Override' });
    expect(res.status).toBe(200);
  });
});
