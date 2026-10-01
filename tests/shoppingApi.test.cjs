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
