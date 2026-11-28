const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createAuthRateLimiters } = require('../middleware/requestLimits');

test('login rate limiter rejects requests after the configured threshold', async (t) => {
  const app = express();
  const { login } = createAuthRateLimiters({
    login: { windowMs: 60_000, max: 2 },
  });
  app.post('/auth/login', login, (_req, res) => {
    res.json({ ok: true });
  });

  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await new Promise((resolve) => server.once('listening', resolve));

  const url = `http://127.0.0.1:${server.address().port}/auth/login`;
  const statuses = [];
  for (let index = 0; index < 3; index += 1) {
    const response = await fetch(url, { method: 'POST' });
    statuses.push(response.status);
  }

  assert.deepEqual(statuses, [200, 200, 429]);
});
