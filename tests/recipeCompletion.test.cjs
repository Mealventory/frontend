const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
function compile(path, mocks = {}) {
  const mod = new Module(path);
  mod.require = name => { if (name in mocks) return mocks[name]; throw Error(name); };
  mod._compile(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, path);
  return mod.exports;
}
const lib = compile('src/lib/recipeCompletion.ts');
const rows = [{ id: 'a', name: 'Rice', quantity: '5', unit: 'cups' }, { id: 'b', name: 'Rice flour', quantity: '1', unit: 'kg' }, { id: 'c', name: 'Rice', quantity: '2', unit: 'bags' }];
test('suggestions retain separate lots without fuzzy matching or assumed amounts', () => {
  assert.deepEqual(lib.suggestedInventory([' rice '], rows).map(r => r.id), ['a', 'c']);
  assert.deepEqual(lib.reviewedDeductions(rows, {}), []);
  assert.deepEqual(lib.reviewedDeductions(rows, { a: '1.25', c: '' }), [{ item_id: 'a', quantity: '1.25', expected_quantity: '5', unit: 'cups' }]);
});
test('review rejects incompatible input and overdraws', () => {
  for (const amount of ['0', '-1', 'six', '2kg', '6', '1.0001', 'Infinity']) assert.throws(() => lib.reviewedDeductions(rows, { a: amount }));
  assert.equal(lib.reviewedDeductions(rows, { a: '5' })[0].quantity, '5');
});
test('interrupted response can retry the identical household-scoped submission', async () => {
  const oldFetch = global.fetch;
  process.env.EXPO_PUBLIC_BACKEND_URL = 'https://example.test';
  const seen = [];
  const request = { completion_id: lib.newCompletionId(), items: [] };
  global.fetch = async (_, options) => {
    seen.push(options);
    if (seen.length === 1) throw Error('connection lost');
    return { ok: true, json: async () => ({ completion_id: request.completion_id }) };
  };
  try {
    await assert.rejects(lib.submitCompletion('token', 'home', request), /not be deducted twice/);
    assert.equal((await lib.submitCompletion('token', 'home', request)).completion_id, request.completion_id);
    assert.equal(seen[0].body, seen[1].body);
    assert.equal(seen[0].headers['X-Household-ID'], 'home');
  } finally { global.fetch = oldFetch; }
});
test('large native reviews persist, isolate households, and survive interrupted replacement', async () => {
  const values = new Map(); let fail = false;
  const store = compile('src/lib/recipeCompletionStorage.ts', {
    'react-native': { Platform: { OS: 'ios' } },
    'expo-secure-store': {
      getItemAsync: async key => values.get(key) ?? null,
      setItemAsync: async (key, value) => { if (fail) throw Error('storage unavailable'); assert.ok(value.length <= 400); values.set(key, value); },
      deleteItemAsync: async key => values.delete(key),
    },
  });
  const record = { request: { completion_id: 'meal-123', items: Array.from({ length: 100 }, (_, i) => ({ item_id: String(i), quantity: '1' })) } };
  await store.writeCompletion('user:home:recipe', record);
  assert.deepEqual(await store.readCompletion('user:home:recipe'), record);
  assert.equal(await store.readCompletion('user:other:recipe'), null);
  fail = true;
  await assert.rejects(store.writeCompletion('user:home:recipe', { ...record, result: {} }));
  assert.deepEqual(await store.readCompletion('user:home:recipe'), record);
  fail = false;
  await store.writeCompletion('user:home:recipe', null);
  assert.equal(await store.readCompletion('user:home:recipe'), null);
});
