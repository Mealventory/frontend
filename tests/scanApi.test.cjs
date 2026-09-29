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

const { uploadScanImage, normalizeScanResponse, KNOWN_FOODS, createUploadPart } = mod.exports;
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
    imageUri: 'data:image/jpeg;base64,/9j/4A==',
  });

  assert.equal(capturedUrl, 'https://backend.example/api/v1/scan/preview');
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
    imageUri: 'data:image/jpeg;base64,/9j/4A==',
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
      imageUri: 'data:image/jpeg;base64,/9j/4A==',
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
      imageUri: 'data:image/jpeg;base64,/9j/4A==',
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
      imageUri: 'data:image/jpeg;base64,/9j/4A==',
    }),
    /sign in again/i
  );

  await assert.rejects(
    uploadScanImage({
      token: 'token',
      householdId: '',
      mode: 'food',
      imageUri: 'data:image/jpeg;base64,/9j/4A==',
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

test('uploadScanImage reports "{element} could not be detected" across all modes (product, receipt, barcode)', async () => {
  const modes = [
    { mode: 'food', expected: 'Product could not be detected' },
    { mode: 'receipt', expected: 'Receipt could not be detected' },
    { mode: 'barcode', expected: 'Barcode could not be detected' },
  ];

  for (const { mode, expected } of modes) {
    global.fetch = async () =>
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    await assert.rejects(
      uploadScanImage({
        token: 'test-token',
        householdId: 'house-123',
        mode,
        imageUri: 'data:image/jpeg;base64,/9j/4A==',
      }),
      new RegExp(expected, 'i')
    );
  }
});

test('uploadScanImage converts internal FormDataPart exception into clean user-friendly message', async () => {
  global.fetch = async () => {
    throw new Error('Unsupported FormDataPart implementation');
  };

  await assert.rejects(
    uploadScanImage({
      token: 'test-token',
      householdId: 'house-123',
      mode: 'food',
      imageUri: 'data:image/jpeg;base64,1234',
    }),
    /Could not upload the photo/i
  );
});

test('uploadScanImage converts ArrayBufferView or blob creation error into clean user-friendly message', async () => {
  global.fetch = async () => {
    throw new Error("Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported");
  };

  await assert.rejects(
    uploadScanImage({
      token: 'test-token',
      householdId: 'house-123',
      mode: 'food',
      imageUri: 'data:image/jpeg;base64,1234',
    }),
    /Could not upload the photo/i
  );
});

test('createUploadPart produces valid binary part with bytes() method', async () => {
  const bytes = new Uint8Array([255, 216, 255, 224]);
  const part = createUploadPart(bytes, 'image/jpeg');
  assert.ok(part);
  assert.equal(typeof part.bytes, 'function');
  const extractedBytes = await part.bytes();
  assert.deepEqual(extractedBytes, bytes);
});



test('local photo read failures never upload the filename as image bytes', async () => {
  let posts = 0;
  const fetchFn = async (url, options) => { if (options) posts++; throw new Error('unreadable'); };
  await assert.rejects(uploadScanImage({ token: 'token', householdId: 'home', mode: 'receipt', imageUri: 'file:///photo.jpg', fetchFn }), /Could not read the photo/);
  assert.equal(posts, 0);
});

test('expiry-only tag stays unnamed for user review', () => {
  const items = normalizeScanResponse({ items: [{ name: '', expiry_date: '2027-01-25', quantity: 1 }] });
  assert.equal(items[0].name, '');
  assert.equal(items[0].expiry_date, '2027-01-25');
});

test('service outages remain service errors rather than detection failures', async () => {
  await assert.rejects(uploadScanImage({ token: 'token', householdId: 'home', mode: 'receipt', imageUri: 'data:image/jpeg;base64,/9j/4A==', fetchFn: async () => new Response(JSON.stringify({ detail: { message: 'Scanning is temporarily unavailable.' } }), { status: 503 }) }), /Scanning is temporarily unavailable/);
});
