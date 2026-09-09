const test = require('node:test');
const assert = require('node:assert/strict');
const { makeApp, resetStats } = require('./server');

test('stats API increments visits and downloads from persisted state', async () => {
  resetStats();
  const app = makeApp();

  const visitRes = await app.request('/api/track/visit');
  assert.equal(visitRes.status, 200);
  const visitBody = await visitRes.json();
  assert.equal(visitBody.visits, 1);

  const downloadRes = await app.request('/api/track/download');
  assert.equal(downloadRes.status, 200);
  const downloadBody = await downloadRes.json();
  assert.equal(downloadBody.downloads, 1);

  const statsRes = await app.request('/api/stats');
  assert.equal(statsRes.status, 200);
  const stats = await statsRes.json();
  assert.equal(stats.visits, 1);
  assert.equal(stats.downloads, 1);
});

test('admin routes require basic auth credentials', async () => {
  const app = makeApp();

  const unauthenticated = await app.request('/admin');
  assert.equal(unauthenticated.status, 401);

  const authHeader = 'Basic ' + Buffer.from('admin:ricochet123').toString('base64');
  const authenticated = await app.request('/admin', {
    headers: { authorization: authHeader },
  });
  assert.equal(authenticated.status, 200);
});
