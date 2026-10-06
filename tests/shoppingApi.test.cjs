const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

process.env.EXPO_PUBLIC_BACKEND_URL = "https://backend.example";

function loadApi() {
  const source = fs.readFileSync("src/lib/shoppingApi.ts", "utf8");
  const mod = new Module("shoppingApi");
  mod._compile(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    "shoppingApi.cjs"
  );
  return mod.exports;
}

test("shopping requests carry auth and household headers", async () => {
  const api = loadApi();
  const original = global.fetch;
  try {
    global.fetch = async (url, options = {}) => {
      assert.equal(url, "https://backend.example/api/v1/shopping");
      assert.equal(options.headers.Authorization, "Bearer token");
      assert.equal(options.headers["X-Household-ID"], "home-1");
      return { ok: true, status: 200, json: async () => [] };
    };
    assert.deepEqual(await api.listShoppingItems("token", "home-1"), []);
  } finally {
    global.fetch = original;
  }
});

test("missing recipe ingredients skip existing names and add unique new items", async () => {
  const api = loadApi();
  const original = global.fetch;
  const posts = [];
  try {
    global.fetch = async (url, options = {}) => {
      if (!options.method) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              id: "1",
              household_id: "home-1",
              food_id: null,
              name: "Salt",
              quantity: "1",
              unit: "units",
              checked: false,
              created_at: "",
              updated_at: "",
            },
          ],
        };
      }
      assert.equal(options.method, "POST");
      const body = JSON.parse(options.body);
      posts.push(body);
      return {
        ok: true,
        status: 201,
        json: async () => ({
          id: String(posts.length + 1),
          household_id: "home-1",
          food_id: null,
          name: body.name,
          quantity: body.quantity,
          unit: body.unit,
          checked: false,
          created_at: "",
          updated_at: "",
        }),
      };
    };

    const result = await api.addMissingIngredientsToShopping(
      "token",
      "home-1",
      ["Salt", "Garlic", "garlic", "Lemon"]
    );

    assert.deepEqual(result, { added: 2, skipped: 1 });
    assert.deepEqual(
      posts.map((item) => item.name),
      ["Garlic", "Lemon"]
    );
    assert.ok(posts.every((item) => item.quantity === 1 && item.unit === "units"));
  } finally {
    global.fetch = original;
  }
});

for (const phase of ['fetch', 'body']) {
  test(`timeout during ${phase} clears timer and allows a successful retry`, async () => {
    const api = loadApi();
    const original = { fetch: global.fetch, setTimeout: global.setTimeout, clearTimeout: global.clearTimeout };
    let expire, clears = 0;
    try {
      global.setTimeout = (fn, ms) => { assert.equal(ms, 12000); expire = fn; return 123; };
      global.clearTimeout = () => { clears++; };
      global.fetch = async (_, { signal }) => {
        const wait = () => new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
          expire();
        });
        return phase === 'fetch' ? wait() : { ok: true, status: 200, json: wait };
      };
      await assert.rejects(api.addShoppingItem('token', 'home', 'Milk'), /timed out.*may have been saved/);
      assert.equal(clears, 1);
      global.fetch = async (_, { signal }) => {
        assert.equal(signal.aborted, false);
        return { ok: true, status: 200, json: async () => [] };
      };
      assert.deepEqual(await api.listShoppingItems('token', 'home'), []);
      assert.equal(clears, 2);
    } finally { Object.assign(global, original); }
  });
}

test('network errors are actionable; authentication errors keep their meaning', async () => {
  const api = loadApi(); const original = global.fetch;
  try {
    global.fetch = async () => { throw new TypeError('Network request failed'); };
    await assert.rejects(api.listShoppingItems('token', 'home'), /Check your connection/);
    for (const [status, message] of [[401, /sign in/], [403, /access/], [404, /not found/]]) {
      global.fetch = async () => ({ ok: false, status });
      await assert.rejects(api.listShoppingItems('token', 'home'), message);
    }
    global.fetch = async () => ({ ok: true, status: 204, json: () => { throw Error('Unexpected body read'); } });
    assert.equal(await api.deleteShoppingItem('token', 'home', 'item'), undefined);
  } finally { global.fetch = original; }
});

test('retry after a partially completed recipe batch skips items already saved', async () => {
  const api = loadApi(); const original = global.fetch;
  const stored = []; let fail = true;
  try {
    global.fetch = async (_, options) => {
      if (!options.method) return { ok: true, status: 200, json: async () => stored };
      const item = JSON.parse(options.body);
      if (item.name === 'Lemon' && fail) { fail = false; throw new TypeError('Offline'); }
      stored.push(item);
      return { ok: true, status: 201, json: async () => item };
    };
    await assert.rejects(api.addMissingIngredientsToShopping('token', 'home', [' Garlic ', 'garlic', 'Lemon']), /connection/);
    assert.deepEqual(await api.addMissingIngredientsToShopping('token', 'home', ['Garlic', 'Lemon']), { added: 1, skipped: 1 });
    assert.deepEqual(stored.map(item => item.name), ['Garlic', 'Lemon']);
  } finally { global.fetch = original; }
});
