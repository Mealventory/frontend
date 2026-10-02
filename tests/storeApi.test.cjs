const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

process.env.EXPO_PUBLIC_BACKEND_URL = "https://backend.example";

function loadApi() {
  const source = fs.readFileSync("src/lib/storeApi.ts", "utf8");
  const mod = new Module("storeApi");
  mod._compile(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    "storeApi.cjs"
  );
  return mod.exports;
}

test("store requests carry auth and household headers", async () => {
  const api = loadApi();
  const original = global.fetch;
  try {
    global.fetch = async (url, options = {}) => {
      assert.equal(url, "https://backend.example/api/v1/stores");
      assert.equal(options.headers.Authorization, "Bearer token");
      assert.equal(options.headers["X-Household-ID"], "home-1");
      return { ok: true, status: 200, json: async () => [] };
    };
    assert.deepEqual(await api.listHouseholdStores("token", "home-1"), []);
  } finally {
    global.fetch = original;
  }
});

test("store URLs normalize missing schemes and reject unsafe protocols", () => {
  const api = loadApi();
  assert.equal(api.normalizeStoreUrl("costco.ca"), "https://costco.ca/");
  assert.equal(
    api.normalizeStoreUrl(" https://www.walmart.ca/grocery "),
    "https://www.walmart.ca/grocery"
  );
  assert.equal(api.normalizeStoreUrl(""), null);
  assert.equal(api.normalizeStoreUrl("javascript:alert(1)"), null);
  assert.equal(api.normalizeStoreUrl("ftp://example.com"), null);
  assert.equal(api.normalizeStoreUrl("not a url"), null);
});

test("create, update, delete, and reorder use the expected routes and payloads", async () => {
  const api = loadApi();
  const original = global.fetch;
  const calls = [];
  try {
    global.fetch = async (url, options = {}) => {
      calls.push({
        url,
        method: options.method || "GET",
        body: options.body ? JSON.parse(options.body) : null,
      });
      if (options.method === "DELETE") {
        return { ok: true, status: 204, json: async () => { throw Error("no body"); } };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: "store-1",
          household_id: "home",
          name: "Costco",
          website_url: "https://costco.ca/",
          sort_order: 0,
          created_at: "",
          updated_at: "",
        }),
      };
    };

    await api.addHouseholdStore("token", "home", " Costco ", "https://costco.ca/");
    await api.updateHouseholdStore("token", "home", "store-1", {
      name: "Costco Wholesale",
      website_url: null,
    });
    await api.deleteHouseholdStore("token", "home", "store-1");

    global.fetch = async (url, options = {}) => {
      calls.push({
        url,
        method: options.method || "GET",
        body: options.body ? JSON.parse(options.body) : null,
      });
      return { ok: true, status: 200, json: async () => [] };
    };
    await api.reorderHouseholdStores("token", "home", ["b", "a"]);

    assert.deepEqual(calls, [
      {
        url: "https://backend.example/api/v1/stores",
        method: "POST",
        body: { name: "Costco", website_url: "https://costco.ca/" },
      },
      {
        url: "https://backend.example/api/v1/stores/store-1",
        method: "PATCH",
        body: { name: "Costco Wholesale", website_url: null },
      },
      {
        url: "https://backend.example/api/v1/stores/store-1",
        method: "DELETE",
        body: null,
      },
      {
        url: "https://backend.example/api/v1/stores/order",
        method: "PUT",
        body: { store_ids: ["b", "a"] },
      },
    ]);
  } finally {
    global.fetch = original;
  }
});

test("store API keeps actionable error semantics", async () => {
  const api = loadApi();
  const original = global.fetch;
  try {
    for (const [status, message] of [
      [401, /sign in/],
      [403, /access/],
      [404, /not found/],
      [409, /order changed/],
      [422, /name and website URL/],
    ]) {
      global.fetch = async () => ({ ok: false, status });
      await assert.rejects(api.listHouseholdStores("token", "home"), message);
    }
  } finally {
    global.fetch = original;
  }
});
