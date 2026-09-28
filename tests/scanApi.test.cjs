const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

process.env.EXPO_PUBLIC_BACKEND_URL = 'https://backend.example';

const zones = new Module('storageZones');
zones._compile(ts.transpileModule(fs.readFileSync('src/lib/storageZones.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, 'storageZones.cjs');
const mod = new Module('scanApi');
const originalRequire = mod.require.bind(mod);
mod.require = name => name === './storageZones' ? zones.exports : originalRequire(name);
mod._compile(
  ts.transpileModule(fs.readFileSync('src/lib/scanApi.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  'scanApi.cjs'
);

const { uploadScanImage, normalizeScanResponse, KNOWN_FOODS } = mod.exports;
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

test('uploadScanImage sends bearer token, household header, and mode in FormData', async () => {
  let capturedUrl = '';
  let capturedOptions = null;

  global.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return new Response(
      JSON.stringify([
        { id: 101, food_id: 1, date_added: '2026-09-17T00:00:00Z', expiry_date: '2026-10-01T00:00:00Z', status: 'fresh' },
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const results = await uploadScanImage({
    token: 'test-jwt-token',
    householdId: 'house-uuid-123',
    mode: 'food',
    imageUri: 'file:///tmp/camera-preview.jpg',
  });

  assert.equal(capturedUrl, 'https://backend.example/api/v1/scan/');
  assert.equal(capturedOptions.method, 'POST');
  assert.equal(capturedOptions.headers.Authorization, 'Bearer test-jwt-token');
  assert.equal(capturedOptions.headers['X-Household-ID'], 'house-uuid-123');

  // Verify normalized result
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'Apple');
  assert.equal(results[0].category, 'Produce');
  assert.equal(results[0].storageZone, 'fridge');
  assert.equal(results[0].expiry_date, '2026-10-01');
});

test('uploadScanImage normalizes detection object with items list', async () => {
  global.fetch = async () =>
    new Response(
      JSON.stringify({
        type: 'receipt',
        confidence: 0.92,
        items: ['chicken breast', 'milk', 'bread'],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  const results = await uploadScanImage({
    token: 'test-token',
    householdId: 'house-123',
    mode: 'receipt',
    imageUri: 'file:///tmp/receipt.jpg',
  });

  assert.equal(results.length, 3);
  assert.equal(results[0].name, 'Chicken breast');
  assert.equal(results[0].confidence, 0.92);
  assert.equal(results[1].name, 'Milk');
  assert.equal(results[2].name, 'Bread');
});

test('uploadScanImage handles 422 no food detected with informative message', async () => {
  global.fetch = async () =>
    new Response(JSON.stringify({ detail: 'No food items detected in image' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });

  await assert.rejects(
    uploadScanImage({
      token: 'test-token',
      householdId: 'house-123',
      mode: 'food',
      imageUri: 'file:///tmp/empty.jpg',
    }),
    /No food items detected/i
  );
});

test('uploadScanImage handles 422 mode mismatch with actionable message', async () => {
  global.fetch = async () =>
    new Response(
      JSON.stringify({ detail: "Selected mode 'food' does not match image content" }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  await assert.rejects(
    uploadScanImage({
      token: 'test-token',
      householdId: 'house-123',
      mode: 'food',
      imageUri: 'file:///tmp/receipt.jpg',
    }),
    /does not match/i
  );
});

test('uploadScanImage rejects missing token or household', async () => {
  await assert.rejects(
    uploadScanImage({
      token: '',
      householdId: 'house-123',
      mode: 'food',
      imageUri: 'file:///tmp/photo.jpg',
    }),
    /sign in again/i
  );

  await assert.rejects(
    uploadScanImage({
      token: 'token',
      householdId: '',
      mode: 'food',
      imageUri: 'file:///tmp/photo.jpg',
    }),
    /household/i
  );
});

test('both scan response shapes use category defaults and preserve overrides', () => {
  const items = [
    { name: 'Milk', category: 'Dairy' },
    { name: 'Peas', category: 'Frozen' },
    { name: 'Milk', category: 'Dairy', storage_zone: 'freezer' },
    { name: 'Spice', category: 'Spices', storage_zone: 'invalid' },
  ];
  for (const response of [items, { items }]) {
    const rows = normalizeScanResponse(response);
    assert.deepEqual(rows.map(row => row.storageZone), ['fridge', 'freezer', 'freezer', 'spicerack']);
    assert.ok(rows.every(row => row.expiry_date === null));
  }
});
