import request from 'supertest';
import { createHash } from 'node:crypto';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeOrg, makeUser, makeMember } from './helpers/factories.js';
import { Invite } from '../src/models/Invite.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

const DAY = 24 * 60 * 60 * 1000;

async function loginAgent(email, password = 'Test@1234') {
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password });
  return agent;
}

// Written directly: createOrResendInvite sends a real email.
const makeInvite = (organization, invitedBy, overrides = {}) =>
  Invite.create({
    organization: organization._id,
    email: overrides.email ?? 'invitee@example.com',
    role: 'EMPLOYEE',
    invitedBy: invitedBy._id,
    tokenHash: createHash('sha256').update(overrides.email ?? 'invitee@example.com').digest('hex'),
    status: overrides.status ?? 'PENDING',
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 5 * DAY),
  });

// Regression: invite.service.js called toSkipLimit without importing it, so the Members page's
// pending-invites list answered 500 (a ReferenceError) for every organization. No test listed
// invites, so the Phase 7 change that wired toSkipLimit into the list services did not notice.
describe('GET /organizations/:orgId/invites', () => {
  it('lists an organization\'s invites with pagination instead of failing', async () => {
    const { organization, owner } = await makeOrg();
    await makeInvite(organization, owner, { email: 'a@example.com' });
    await makeInvite(organization, owner, { email: 'b@example.com' });

    const agent = await loginAgent(owner.email);
    const res = await agent.get(`/api/v1/organizations/${organization._id}/invites?page=1&limit=20`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 20, total: 2 });
  });

  it('is an empty page, not an error, for an organization with no invites', async () => {
    const { organization, owner } = await makeOrg();
    const agent = await loginAgent(owner.email);
    const res = await agent.get(`/api/v1/organizations/${organization._id}/invites?page=1&limit=20`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('pages through results', async () => {
    const { organization, owner } = await makeOrg();
    for (const name of ['a', 'b', 'c']) await makeInvite(organization, owner, { email: `${name}@example.com` });

    const agent = await loginAgent(owner.email);
    const first = await agent.get(`/api/v1/organizations/${organization._id}/invites?page=1&limit=2`);
    const second = await agent.get(`/api/v1/organizations/${organization._id}/invites?page=2&limit=2`);
    expect(first.body.data).toHaveLength(2);
    expect(second.body.data).toHaveLength(1);
    expect(second.body.pagination).toMatchObject({ page: 2, total: 3, totalPages: 2 });
  });

  it('flags an expired pending invite and honours the status filter', async () => {
    const { organization, owner } = await makeOrg();
    await makeInvite(organization, owner, { email: 'old@example.com', expiresAt: new Date(Date.now() - DAY) });
    await makeInvite(organization, owner, { email: 'used@example.com', status: 'ACCEPTED' });

    const agent = await loginAgent(owner.email);
    const all = await agent.get(`/api/v1/organizations/${organization._id}/invites?page=1&limit=20`);
    expect(all.body.data.find((i) => i.email === 'old@example.com').isExpired).toBe(true);
    expect(all.body.data.find((i) => i.email === 'used@example.com').isExpired).toBe(false);

    const pending = await agent.get(`/api/v1/organizations/${organization._id}/invites?page=1&limit=20&status=PENDING`);
    expect(pending.body.data.map((i) => i.email)).toEqual(['old@example.com']);
  });

  it("does not show another organization's invites", async () => {
    const { organization, owner } = await makeOrg();
    const other = await makeOrg();
    await makeInvite(other.organization, other.owner, { email: 'secret@example.com' });

    const agent = await loginAgent(owner.email);
    const res = await agent.get(`/api/v1/organizations/${organization._id}/invites?page=1&limit=20`);
    expect(res.body.data).toEqual([]);
    const forbidden = await agent.get(`/api/v1/organizations/${other.organization._id}/invites?page=1&limit=20`);
    expect(forbidden.status).toBe(403);
  });
});
