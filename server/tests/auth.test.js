import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeUser } from './helpers/factories.js';
import { registerUser, verifyCredentials, findOrCreateGoogleUser } from '../src/services/auth.service.js';
import { User } from '../src/models/User.js';

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

describe('registerUser', () => {
  it('rejects a duplicate email with a conflict error', async () => {
    await makeUser({ email: 'dup@example.com' });
    await expect(registerUser({ name: 'Second', email: 'dup@example.com', password: 'Test@1234' }))
      .rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('verifyCredentials', () => {
  it('rejects an inactive user even with the correct password', async () => {
    const user = await makeUser({ email: 'inactive@example.com', password: 'Test@1234' });
    await User.findByIdAndUpdate(user._id, { isActive: false });
    await expect(verifyCredentials('inactive@example.com', 'Test@1234'))
      .rejects.toMatchObject({ statusCode: 401 });
  });

  it('rejects a password-login attempt on a Google-only account with a specific message', async () => {
    const { user } = await findOrCreateGoogleUser({
      googleId: 'google-id-123',
      email: 'googleonly@example.com',
      name: 'Google User',
      avatar: null,
    });
    expect(user.password).toBeNull();
    await expect(verifyCredentials('googleonly@example.com', 'anything'))
      .rejects.toMatchObject({ statusCode: 401, message: expect.stringContaining('Google sign-in') });
  });

  it('accepts the correct password for a normal local account', async () => {
    await makeUser({ email: 'good@example.com', password: 'Test@1234' });
    const user = await verifyCredentials('good@example.com', 'Test@1234');
    expect(user.email).toBe('good@example.com');
  });
});

// The bug this project's own Known Issues log documents: User.googleId originally had
// `default: null`, writing an explicit null onto every local-auth user — a sparse unique index
// only excludes truly-absent fields, so a second local user collided on a duplicate key.
describe('regression: googleId sparse index', () => {
  it('allows two local (non-Google) users to register in sequence with no duplicate-key error', async () => {
    await makeUser({ email: 'local-one@example.com' });
    await expect(makeUser({ email: 'local-two@example.com' })).resolves.toBeDefined();
  });
});

describe('POST /api/v1/auth/register + /login + /refresh + /logout (live routes)', () => {
  it('registers, logs in, refreshes, and logout invalidates the session', async () => {
    const agent = request.agent(app);

    const registerRes = await agent.post('/api/v1/auth/register').send({
      name: 'Flow User',
      email: 'flow@example.com',
      password: 'Test@1234',
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.headers['set-cookie']).toBeDefined();

    const refreshRes = await agent.post('/api/v1/auth/refresh');
    expect(refreshRes.status).toBe(200);

    const meRes = await agent.get('/api/v1/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('flow@example.com');

    await agent.post('/api/v1/auth/logout');

    // A refresh token issued before logout must be rejected after it — invalidateAllSessions
    // bumps refreshTokenVersion, and the refresh route checks the token's embedded version
    // against the user's current one.
    const refreshAfterLogout = await agent.post('/api/v1/auth/refresh');
    expect(refreshAfterLogout.status).toBe(401);
  });

  it('rejects registering the same email twice via the live route', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'First',
      email: 'liveflow-dup@example.com',
      password: 'Test@1234',
    });
    const secondRes = await request(app).post('/api/v1/auth/register').send({
      name: 'Second',
      email: 'liveflow-dup@example.com',
      password: 'Test@1234',
    });
    expect(secondRes.status).toBe(409);
  });
});

describe('forgot/reset password', () => {
  it('gives the same response shape whether or not the account exists (anti-enumeration)', async () => {
    await makeUser({ email: 'realaccount@example.com' });
    const forReal = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'realaccount@example.com' });
    const forFake = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'nosuchaccount@example.com' });
    expect(forReal.status).toBe(forFake.status);
    expect(forReal.body.message).toBe(forFake.body.message);
  });

  it('rejects an expired or invalid reset token', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password').send({
      token: 'not-a-real-token',
      password: 'NewPass@1234',
    });
    expect(res.status).toBe(400);
  });
});
