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
const { inventoryRequest, toFoodItem } = mod.exports;
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
