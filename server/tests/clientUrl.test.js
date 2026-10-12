import { jest } from '@jest/globals';
import request from 'supertest';

// Config is parsed once per test file. A real-world CLIENT_URL: the live site pasted with a trailing
// slash, plus a local dev origin for CORS, with stray spaces.
process.env.CLIENT_URL = ' https://app.example/ , http://localhost:5173 ';
const { default: app } = await import('../src/app.js');
const { parseClientOrigins, appUrl } = await import('../src/config/env.js');
const { logger } = await import('../src/config/logger.js');
const { connectTestDb, clearTestDb, disconnectTestDb } = await import('./setup/testDb.js');
const { makeUser, makeOrg } = await import('./helpers/factories.js');
const { createOrResendInvite } = await import('../src/services/invite.service.js');

beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

const allowed = async (origin) =>
  (await request(app).get('/api/v1/health').set('Origin', origin)).headers['access-control-allow-origin'];

// Emails aren't really sent under test (no provider configured); the dev-console log carries them.
function captureEmails() {
  const spy = jest.spyOn(logger, 'info');
  return {
    texts: () => spy.mock.calls.filter(([, msg]) => String(msg).includes('[email:dev-console]')).map(([obj]) => obj.text),
    restore: () => spy.mockRestore(),
  };
}

describe('parseClientOrigins', () => {
  it('trims, drops trailing slashes and empty entries', () => {
    expect(parseClientOrigins(' https://a.example/ ,http://localhost:5173//,, ')).toEqual(['https://a.example', 'http://localhost:5173']);
  });
});

describe('CLIENT_URL with a trailing slash and several origins', () => {
  it('lets the site through even though it was configured with a trailing slash', async () => {
    // Browsers send the origin without a slash; this is what broke the first deployment.
    expect(await allowed('https://app.example')).toBe('https://app.example');
    expect(await allowed('http://localhost:5173')).toBe('http://localhost:5173');
  });

  it('links emails to the first origin only, never to the whole comma-separated value', async () => {
    expect(appUrl).toBe('https://app.example');
    const emails = captureEmails();

    const user = await makeUser({ email: 'resetme@example.com' });
    await request(app).post('/api/v1/auth/forgot-password').send({ email: user.email });

    const { organization, owner } = await makeOrg();
    await createOrResendInvite({ organization, email: 'newcomer@example.com', role: 'EMPLOYEE', invitedBy: owner });

    const [reset, invite] = emails.texts();
    emails.restore();
    expect(reset).toMatch(/https:\/\/app\.example\/reset-password\?token=[a-f0-9]+/);
    expect(invite).toMatch(/https:\/\/app\.example\/invites\/accept\?token=[a-f0-9]+/);
    for (const text of [reset, invite]) {
      expect(text).not.toContain(',');
      expect(text).not.toContain('localhost');
      expect(text).not.toContain('example//');
    }
  });
});
