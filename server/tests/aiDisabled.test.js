import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, clearTestDb, disconnectTestDb } from './setup/testDb.js';
import { makeOrg } from './helpers/factories.js';

// jestEnv.js blanks GEMINI_API_KEY, so this file runs the app the way it runs before anyone has
// added a key: everything must degrade to a clear message, never crash and never call Google.
beforeAll(connectTestDb);
afterEach(clearTestDb);
afterAll(disconnectTestDb);

async function setup() {
  const { organization, owner } = await makeOrg();
  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email: owner.email, password: 'Test@1234' });
  return { agent, base: `/api/v1/organizations/${organization._id}/ai` };
}

describe('ForgeAI without a Gemini key', () => {
  it('reports that it is off, so the UI can show a disabled state', async () => {
    const { agent, base } = await setup();
    const res = await agent.get(`${base}/status`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ enabled: false });
  });

  it('answers every task with the same clear 503', async () => {
    const { agent, base } = await setup();
    const bodies = {
      '/draft': { prompt: 'Plan a team day' },
      '/concepts': { vibe: 'Team bonding' },
      '/venues': { theme: 'Offsite', capacity: 20 },
      '/enhance': { text: 'Come to the party', mode: 'professional' },
    };
    for (const [path, body] of Object.entries(bodies)) {
      const res = await agent.post(`${base}${path}`).send(body);
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('AI_DISABLED');
      expect(res.body.error.message).toBe("ForgeAI isn't set up on this server yet. Ask an admin to add a Gemini API key.");
    }
  });
});
