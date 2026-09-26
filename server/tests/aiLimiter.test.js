import express from 'express';
import request from 'supertest';
import { createAiLimiter } from '../src/middleware/aiLimiter.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

function appWithLimit(limit) {
  const app = express();
  app.use((req, res, next) => {
    req.user = { _id: req.headers['x-user'] };
    next();
  });
  app.get('/ai', createAiLimiter({ limit, windowMs: 60_000 }), (req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('per-user AI limiter', () => {
  it('lets a person send their allowance, then says how long to wait', async () => {
    const app = appWithLimit(2);
    await request(app).get('/ai').set('x-user', 'u1').expect(200);
    await request(app).get('/ai').set('x-user', 'u1').expect(200);
    const res = await request(app).get('/ai').set('x-user', 'u1');

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(res.body.error.message).toMatch(/wait about \d+ seconds/);
    expect(Number(res.headers['ratelimit-reset'])).toBeGreaterThan(0);
  });

  it('counts each person separately, even from the same address (an office shares one)', async () => {
    const app = appWithLimit(1);
    await request(app).get('/ai').set('x-user', 'alice').expect(200);
    await request(app).get('/ai').set('x-user', 'alice').expect(429);
    await request(app).get('/ai').set('x-user', 'bob').expect(200);
  });
});
