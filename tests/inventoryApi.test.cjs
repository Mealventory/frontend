const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
process.env.EXPO_PUBLIC_BACKEND_URL = 'https://backend.example';
const mod = new Module('inventoryApi');
mod._compile(ts.transpileModule(fs.readFileSync('src/lib/inventoryApi.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, 'inventoryApi.cjs');
const { inventoryRequest, toFoodItem, batchCreateInventoryItems } = mod.exports;
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
test('delete sends bearer and household identity, handles empty 204 response', async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://backend.example/api/v1/items/item-id');
    assert.equal(options.method, 'DELETE');
    assert.equal(options.headers.Authorization, 'Bearer token');
    assert.equal(options.headers['X-Household-ID'], 'house-id');
    return new Response(null, { status: 204 });
  };
  assert.equal(await inventoryRequest('token', 'house-id', 'DELETE', 'item-id'), undefined);
});
test('failed deletions reject; unavailable routes never masquerade as successful deletes', async () => {
  for (const status of [401, 403, 404, 500]) {
    global.fetch = async () => new Response('{}', { status });
    await assert.rejects(inventoryRequest('token', 'home', 'DELETE', 'item'));
  }
});
test('another phone already deleted this household item', async () => {
  global.fetch = async () => new Response(JSON.stringify({ detail: 'Item not found in this household' }), { status: 404 });
  await inventoryRequest('token', 'home', 'DELETE', 'item');
});
test('database IDs, quantities, and unknown expiration dates are preserved', () => {
  const item = toFoodItem({ id: 'db-uuid', household_id: 'home', name: 'Rice', category: 'Pantry', quantity: '2.500', unit: 'kg', expiry_date: null, status: 'active' });
  assert.equal(item.id, 'db-uuid'); assert.equal(item.quantity, '2.5 kg');
  assert.equal(item.expDate, 'Not set'); assert.equal(item.expiryDate, null);
});
test('selected zone is sent and survives loading from the backend', async () => {
  const body = { name: 'Milk', category: 'Dairy', quantity: 1, unit: 'bottle', expiry_date: null, storage_zone: 'fridge' };
  global.fetch = async (_, options) => {
    assert.equal(JSON.parse(options.body).storage_zone, 'fridge');
    return new Response(JSON.stringify({ ...body, id: 'item', household_id: 'home', status: 'active' }), { status: 201 });
  };
  const row = await inventoryRequest('token', 'home', 'POST', undefined, body);
  assert.equal(toFoodItem(row).storageZone, 'fridge');
  assert.equal(toFoodItem({ ...row, storage_zone: null }).storageZone, undefined);
});
test('scan defaults support categories and unknown categories safely', () => {
  const zones = new Module('storageZones');
  zones._compile(ts.transpileModule(fs.readFileSync('src/lib/storageZones.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText, 'storageZones.cjs');
  for (const [category, expected] of [[' Dairy ', 'fridge'], ['Meat', 'fridge'], ['Frozen', 'freezer'], ['Frozen Foods', 'freezer'], ['Spices', 'spicerack'], ['Unknown', 'pantry']]) {
    assert.equal(zones.exports.defaultScanZone(category), expected);
  }
});
test('consume and discard use scoped POST endpoints, not deletion', async () => {
  for (const action of ['consume', 'discard']) {
    global.fetch = async (url, options) => {
      assert.equal(url, 'https://backend.example/api/v1/items/item-id/' + action);
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.Authorization, 'Bearer token');
      assert.equal(options.headers['X-Household-ID'], 'home');
      return new Response(JSON.stringify({ id: 'item-id', status: action === 'consume' ? 'consumed' : 'discarded' }));
    };
    const row = await inventoryRequest('token', 'home', 'POST', 'item-id', undefined, action);
    assert.equal(row.status, action === 'consume' ? 'consumed' : 'discarded');
  }
});
test('failed status actions reject and inactive items explain recovery', async () => {
  global.fetch = async () => new Response('{}', { status: 400 });
  await assert.rejects(inventoryRequest('token', 'home', 'POST', 'item', undefined, 'consume'), /no longer active/);
  for (const status of [401, 403, 404, 500]) {
    global.fetch = async () => new Response('{}', { status });
    await assert.rejects(inventoryRequest('token', 'home', 'POST', 'item', undefined, 'discard'));
  }
});

test('batchCreateInventoryItems posts items array to /api/v1/inventory/batch with bearer and household headers', async () => {
  const items = [
    { name: 'Organic Milk', category: 'Dairy', quantity: 1, unit: 'gal', expiry_date: '2026-10-01', storage_zone: 'fridge' },
    { name: 'Sourdough', category: 'Bakery', quantity: 1, unit: 'loaf', expiry_date: null, storage_zone: 'pantry' },
  ];
  let requestedUrl = '';
  let requestedHeaders = {};
  let requestedBody = null;
  global.fetch = async (url, options) => {
    requestedUrl = url;
    requestedHeaders = options.headers;
    requestedBody = JSON.parse(options.body);
    return new Response(JSON.stringify([{ id: 'uuid-1' }, { id: 'uuid-2' }]), { status: 201 });
  };
  const result = await batchCreateInventoryItems('jwt-token-123', 'household-456', items);
  assert.equal(requestedUrl, 'https://backend.example/api/v1/inventory/batch');
  assert.equal(requestedHeaders.Authorization, 'Bearer jwt-token-123');
  assert.equal(requestedHeaders['X-Household-ID'], 'household-456');
  assert.equal(requestedBody.length, 2);
  assert.equal(requestedBody[0].name, 'Organic Milk');
  assert.equal(requestedBody[0].storage_zone, 'fridge');
  assert.equal(result.length, 2);
});

test('batchCreateInventoryItems falls back to /api/v1/items/batch when /inventory/batch returns 404', async () => {
  const items = [{ name: 'Rice', category: 'Pantry', quantity: 1, unit: 'kg', expiry_date: null, storage_zone: 'pantry' }];
  let urls = [];
  global.fetch = async (url) => {
    urls.push(url);
    if (url.includes('/inventory/batch')) {
      return new Response(JSON.stringify({ detail: 'Not Found' }), { status: 404 });
    }
    return new Response(JSON.stringify([{ id: 'uuid-1', name: 'Rice' }]), { status: 201 });
  };
  const result = await batchCreateInventoryItems('jwt-token', 'household-1', items);
  assert.equal(urls.length, 2);
  assert.equal(urls[0], 'https://backend.example/api/v1/inventory/batch');
  assert.equal(urls[1], 'https://backend.example/api/v1/items/batch');
  assert.equal(result.length, 1);
});

test('batchCreateInventoryItems returns empty array for empty items list without fetching', async () => {
  let called = false;
  global.fetch = async () => { called = true; return new Response('{}'); };
  const res = await batchCreateInventoryItems('token', 'household', []);
  assert.equal(called, false);
  assert.deepEqual(res, []);
});


test('inventory image references survive API row mapping', () => {
  const item = toFoodItem({
    id: 'photo-item',
    household_id: 'home',
    name: 'Yogurt',
    category: 'Dairy',
    quantity: 1,
    unit: 'tub',
    expiry_date: null,
    status: 'active',
    image_ref: 'home/photo.jpg',
  });
  assert.equal(item.imageRef, 'home/photo.jpg');
});

test('stacked inventory row maps accumulated quantity and updated remaining percentage', () => {
  const item = toFoodItem({
    id: 'stacked-item-1',
    household_id: 'home',
    name: 'Apples',
    category: 'Produce',
    quantity: '5.000',
    remaining_percent: '100.0',
    is_low_stock: false,
    unit: 'pieces',
    expiry_date: '2026-10-30',
    status: 'active',
    storage_zone: 'fridge',
  });
  assert.equal(item.id, 'stacked-item-1');
  assert.equal(item.quantity, '5 pieces');
  assert.equal(item.remainingPercent, 100);
  assert.equal(item.isLowStock, false);
});
