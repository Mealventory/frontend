const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function load(file, mocks = {}) {
  const mod = new Module(file, module);
  mod.paths = module.paths;
  const original = mod.require.bind(mod);
  mod.require = (name) => (name in mocks ? mocks[name] : original(name));
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    file
  );
  return mod.exports;
}

const {
  toSafeSecureStoreKey,
  createSecureStoreAdapter,
  createWebStorageAdapter,
  CHUNK_SIZE,
} = load('src/lib/authStorage.ts', {
  'react-native': { Platform: { OS: 'ios' } },
});

test('toSafeSecureStoreKey keeps valid characters and encodes illegal characters for SecureStore', () => {
  const normalKey = 'sb-mealventory-auth-token';
  assert.equal(toSafeSecureStoreKey(normalKey), 'sb-mealventory-auth-token');

  const specialKey = 'https://xyz.supabase.co:443/auth/v1';
  const safeKey = toSafeSecureStoreKey(specialKey);
  assert.match(safeKey, /^[a-zA-Z0-9._-]+$/);
  assert.ok(!safeKey.includes(':'));
  assert.ok(!safeKey.includes('/'));
});

test('SecureStore adapter stores and retrieves standard session payloads directly', async () => {
  const store = new Map();
  const mockStore = {
    getItemAsync: async (k) => store.get(k) ?? null,
    setItemAsync: async (k, v) => { store.set(k, v); },
    deleteItemAsync: async (k) => { store.delete(k); },
  };

  const adapter = createSecureStoreAdapter(mockStore);
  const sessionData = JSON.stringify({
    access_token: 'valid-jwt-token-12345',
    refresh_token: 'refresh-token-abcde',
    user: { id: 'usr-1', email: 'test@mealventory.app' },
  });

  await adapter.setItem('auth-key', sessionData);
  assert.equal(store.has('auth-key'), true);
  assert.equal(store.has('auth-key_chunks'), false);

  const restored = await adapter.getItem('auth-key');
  assert.equal(restored, sessionData);

  await adapter.removeItem('auth-key');
  assert.equal(store.has('auth-key'), false);
  assert.equal(await adapter.getItem('auth-key'), null);
});

test('SecureStore adapter chunks large sessions exceeding CHUNK_SIZE and reconstructs them', async () => {
  const store = new Map();
  const mockStore = {
    getItemAsync: async (k) => store.get(k) ?? null,
    setItemAsync: async (k, v) => { store.set(k, v); },
    deleteItemAsync: async (k) => { store.delete(k); },
  };

  const adapter = createSecureStoreAdapter(mockStore);
  // Create a session payload larger than 1800 chars (e.g. 4000 chars)
  const longMetadata = 'x'.repeat(4000);
  const largePayload = JSON.stringify({
    access_token: 'tok.' + longMetadata,
    refresh_token: 'refresh-large',
  });
  assert.ok(largePayload.length > CHUNK_SIZE * 2);

  await adapter.setItem('sb-large-token', largePayload);

  // Verifies chunks and chunk count metadata are saved
  assert.equal(store.has('sb-large-token_chunks'), true);
  const chunkCount = parseInt(store.get('sb-large-token_chunks'), 10);
  assert.ok(chunkCount >= 3);
  for (let i = 0; i < chunkCount; i++) {
    assert.equal(store.has(`sb-large-token_chunk_${i}`), true);
    assert.ok(store.get(`sb-large-token_chunk_${i}`).length <= CHUNK_SIZE);
  }

  // Verifies complete transparent reconstruction
  const restored = await adapter.getItem('sb-large-token');
  assert.equal(restored, largePayload);

  // Verifies removeItem clears all chunks and metadata
  await adapter.removeItem('sb-large-token');
  assert.equal(store.has('sb-large-token_chunks'), false);
  for (let i = 0; i < chunkCount; i++) {
    assert.equal(store.has(`sb-large-token_chunk_${i}`), false);
  }
  assert.equal(await adapter.getItem('sb-large-token'), null);
});

test('SecureStore adapter replaces chunked values with small values cleanly', async () => {
  const store = new Map();
  const mockStore = {
    getItemAsync: async (k) => store.get(k) ?? null,
    setItemAsync: async (k, v) => { store.set(k, v); },
    deleteItemAsync: async (k) => { store.delete(k); },
  };

  const adapter = createSecureStoreAdapter(mockStore);
  const largePayload = 'A'.repeat(3000);
  await adapter.setItem('token', largePayload);
  assert.equal(store.has('token_chunks'), true);

  // Overwrite with small value
  await adapter.setItem('token', 'small-val');
  assert.equal(store.get('token'), 'small-val');
  assert.equal(store.has('token_chunks'), false);
  assert.equal(store.has('token_chunk_0'), false);
  assert.equal(await adapter.getItem('token'), 'small-val');
});

test('Web storage adapter stores, retrieves, and removes from localStorage', () => {
  const mockLocalStorage = new Map();
  const storage = {
    getItem: (k) => mockLocalStorage.get(k) ?? null,
    setItem: (k, v) => { mockLocalStorage.set(k, v); },
    removeItem: (k) => { mockLocalStorage.delete(k); },
  };

  const adapter = createWebStorageAdapter(storage);
  adapter.setItem('sb-web-session', '{"web":true}');
  assert.equal(mockLocalStorage.get('sb-web-session'), '{"web":true}');
  assert.equal(adapter.getItem('sb-web-session'), '{"web":true}');

  adapter.removeItem('sb-web-session');
  assert.equal(mockLocalStorage.has('sb-web-session'), false);
  assert.equal(adapter.getItem('sb-web-session'), null);
});

test('Web storage adapter falls back to in-memory storage if localStorage throws', () => {
  const throwingStorage = {
    getItem: () => { throw new Error('SecurityError: Access Denied'); },
    setItem: () => { throw new Error('QuotaExceededError'); },
    removeItem: () => { throw new Error('SecurityError'); },
  };

  const adapter = createWebStorageAdapter(throwingStorage);
  adapter.setItem('key', 'fallback-val');
  assert.equal(adapter.getItem('key'), 'fallback-val');
  adapter.removeItem('key');
  assert.equal(adapter.getItem('key'), null);
});
