import express from 'express';
import request from 'supertest';
import { createAccountLimiter } from '../src/middleware/rateLimiters.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

// The setup these limiters exist for: two trusted proxy hops, so anyone calling the API directly can
// put any address they like in X-Forwarded-For and every IP-based limit sees a "new" client.
function appWith(limiter) {
  const app = express();
  app.set('trust proxy', 2);
  app.use(express.json());
  app.post('/login', limiter, (req, res) =>
    req.body.password === 'right' ? res.json({ ok: true }) : res.status(401).json({ ok: false })
  );
  app.use(errorHandler);
  return app;
}

let n = 0;
const attempt = (app, email, password = 'wrong') =>
  request(app)
    .post('/login')
    .set('X-Forwarded-For', `198.51.100.${(n += 1) % 250}, 203.0.113.9`)
    .send({ email, password });

const limiter = () =>
  createAccountLimiter({ limit: 3, windowMs: 60_000, skipSuccessfulRequests: true, message: 'Too many failed sign-in attempts.' });

describe('per-account limiter', () => {
  it('stops further attempts on one account even when every attempt forges a different IP', async () => {
    const app = appWith(limiter());
    for (let i = 0; i < 3; i += 1) expect((await attempt(app, 'victim@example.com')).status).toBe(401);

    const blocked = await attempt(app, 'victim@example.com');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatchObject({ code: 'RATE_LIMITED', message: 'Too many failed sign-in attempts.' });
  });

  it('treats the address case- and space-insensitively, so it cannot be dodged by rewriting it', async () => {
    const app = appWith(limiter());
    await attempt(app, 'victim@example.com');
    await attempt(app, 'VICTIM@Example.com');
    await attempt(app, '  victim@example.com ');
    expect((await attempt(app, 'Victim@EXAMPLE.com')).status).toBe(429);
  });

  it('leaves other accounts alone', async () => {
    const app = appWith(limiter());
    for (let i = 0; i < 4; i += 1) await attempt(app, 'victim@example.com');
    expect((await attempt(app, 'someone-else@example.com')).status).toBe(401);
  });

  it('does not count successful sign-ins, so the owner using the account normally never hits it', async () => {
    const app = appWith(limiter());
    await attempt(app, 'owner@example.com');
    await attempt(app, 'owner@example.com');
    for (let i = 0; i < 5; i += 1) expect((await attempt(app, 'owner@example.com', 'right')).status).toBe(200);
    expect((await attempt(app, 'owner@example.com')).status).toBe(401);
    expect((await attempt(app, 'owner@example.com')).status).toBe(429);
  });

  it('lets a request with no email through, for validation to answer', async () => {
    const app = appWith(limiter());
    for (let i = 0; i < 5; i += 1) {
      expect((await request(app).post('/login').send({ password: 'wrong' })).status).toBe(401);
    }
  });
});
