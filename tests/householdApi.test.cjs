const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const originalFetch = global.fetch;
const oldUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
process.env.EXPO_PUBLIC_BACKEND_URL = 'http://127.0.0.1:8000';
const compiled = ts.transpileModule(fs.readFileSync('src/lib/householdApi.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const moduleUnderTest = new Module('householdApi');
moduleUnderTest._compile(compiled, 'householdApi.cjs');
const { householdRequest } = moduleUnderTest.exports;
afterEach(() => { global.fetch = originalFetch; });

test('create sends the authenticated identity token and JSON to backend', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://127.0.0.1:8000/api/v1/households');
    assert.equal(init.headers.Authorization, 'Bearer test-token');
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), { name: 'Smith Family' });
    return new Response(JSON.stringify({ id: 'household-1', role: 'owner' }), { status: 201 });
  };
  assert.equal((await householdRequest('', 'test-token', { name: 'Smith Family' })).role, 'owner');
});
test('members are fetched for the selected household', async () => {
  global.fetch = async (url, init) => {
    assert.equal(url, 'http://127.0.0.1:8000/api/v1/households/home-id/members');
    assert.equal(init.method, 'GET');
    return new Response('[]');
  };
  assert.deepEqual(await householdRequest('/home-id/members', 'token'), []);
});
test('invalid invite is actionable and never shown as successful', async () => {
  global.fetch = async () => new Response('{}', { status: 404 });
  await assert.rejects(householdRequest('/join', 'token', { invite_code: 'ABC123' }), /wasn’t found/);
});
test('expired authentication asks for sign-in', async () => {
  global.fetch = async () => new Response('{}', { status: 401 });
  await assert.rejects(householdRequest('/me', 'token'), /Sign out and sign in/);
});
test('backend failures do not expose server diagnostics', async () => {
  global.fetch = async () => new Response('private database diagnostics', { status: 500 });
  await assert.rejects(householdRequest('/me', 'token'), /service is unavailable/);
});
test('offline failure explains the connection problem', async () => {
  global.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(householdRequest('/me', 'token'), /Could not reach the backend/);
});

test('Expo cancellation after our timeout produces an actionable message', async () => {
  const savedTimeout = global.setTimeout;
  const savedClearTimeout = global.clearTimeout;
  try {
    global.setTimeout = callback => { callback(); return 0; };
    global.clearTimeout = () => {};
    global.fetch = async (_, init) => {
      assert.equal(init.signal.aborted, true);
      throw new Error('fetch failed: FetchRequestCanceledException');
    };
    await assert.rejects(householdRequest('/me', 'token'), /backend request timed out/);
  } finally {
    global.setTimeout = savedTimeout;
    global.clearTimeout = savedClearTimeout;
  }
});
