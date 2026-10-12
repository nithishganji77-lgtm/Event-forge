import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import { logger } from '../src/config/logger.js';

// jestEnv sets CLIENT_URL to this single origin.
const ALLOWED = 'http://localhost:5175';
const STRANGER = 'https://not-our-frontend.example';

describe('CORS', () => {
  it('lets the configured frontend through and says so in the CORS header', async () => {
    const res = await request(app).get('/api/v1/health').set('Origin', ALLOWED);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED);
  });

  it('lets requests with no Origin through (curl, health checks, same-origin GETs)', async () => {
    expect((await request(app).get('/api/v1/health')).status).toBe(200);
  });

  it('refuses an unknown origin with a 403 and its own code, not a "Something went wrong" 500', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    // The request that used to come back as a misleading 500 from a misconfigured deployment.
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', STRANGER)
      .send({ email: 'ava@eventforge.dev', password: 'Demo@1234' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatchObject({
      code: 'ORIGIN_NOT_ALLOWED',
      message: "This website isn't allowed to use the EventForge API.",
    });
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    // The fix for the deployer is in the server log, with the origin to add.
    expect(warn).toHaveBeenCalledWith({ origin: STRANGER }, expect.stringContaining('CLIENT_URL'));
    warn.mockRestore();
  });
});
