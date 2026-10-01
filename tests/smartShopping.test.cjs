const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

process.env.EXPO_PUBLIC_BACKEND_URL = "https://backend.example";

function compileFile(path, mocks = {}) {
  const source = fs.readFileSync(path, "utf8");
  const mod = new Module(path);
  const originalRequire = mod.require.bind(mod);
  mod.require = (name) =>
    Object.prototype.hasOwnProperty.call(mocks, name)
      ? mocks[name]
      : originalRequire(name);
  mod._compile(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    path.replace(/\.tsx?$/, ".cjs")
  );
  return mod.exports;
}

test("consumed suggestions use household auth, dedupe names, and prefer the newest rows", async () => {
  const api = compileFile("src/lib/shoppingApi.ts");
  const originalFetch = global.fetch;
  try {
    global.fetch = async (url, options = {}) => {
      assert.equal(url, "https://backend.example/api/v1/items?status=consumed");
      assert.equal(options.headers.Authorization, "Bearer token");
      assert.equal(options.headers["X-Household-ID"], "home-1");
      return {
        ok: true,
        status: 200,
        json: async () => [
          { name: "Milk" },
          { name: "Bread" },
          { name: " milk " },
          { name: "Eggs" },
        ],
      };
    };

    assert.deepEqual(
      await api.listConsumedShoppingSuggestions("token", "home-1"),
      ["Eggs", "milk", "Bread"]
    );
    assert.deepEqual(
      await api.listConsumedShoppingSuggestions("token", "home-1", 2),
      ["Eggs", "milk"]
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("smart shopping storage suggestions keep obvious cold and frozen items out of the pantry", () => {
  const helper = compileFile("src/lib/shoppingPantry.ts", {
    "./expiryPredictionApi": {
      predictExpiry: async () => ({
        predicted_expiry_date: null,
        source: "unavailable",
        explanation: "",
      }),
    },
  });

  assert.equal(helper.suggestedStorageZone("Whole Milk"), "fridge");
  assert.equal(helper.suggestedStorageZone("Frozen peas"), "freezer");
  assert.equal(helper.suggestedStorageZone("Paprika spice"), "spicerack");
  assert.equal(helper.suggestedStorageZone("Basmati rice"), "pantry");
});

test("purchased items preserve quantity and retry ambiguous expiry predictions as unopened", async () => {
  const helper = compileFile("src/lib/shoppingPantry.ts", {
    "./expiryPredictionApi": {
      predictExpiry: async () => {
        throw new Error("default should be replaced by injected predictor");
      },
    },
  });
  const calls = [];
  const predict = async (_token, _household, input) => {
    calls.push(input);
    if (input.name === "Whole Milk" && !input.food_state) {
      return {
        predicted_expiry_date: null,
        source: "catalogue",
        explanation: "Choose state",
        food_state_options: ["opened", "unopened"],
      };
    }
    return {
      predicted_expiry_date:
        input.name === "Whole Milk" ? "2026-10-12" : "2027-02-01",
      source: "catalogue",
      explanation: "catalogue",
    };
  };

  const purchased = [
    {
      id: "1",
      household_id: "home",
      food_id: null,
      name: "Whole Milk",
      quantity: "2",
      unit: "cartons",
      checked: true,
      created_at: "",
      updated_at: "",
    },
    {
      id: "2",
      household_id: "home",
      food_id: null,
      name: "Basmati rice",
      quantity: 1,
      unit: "bag",
      checked: true,
      created_at: "",
      updated_at: "",
    },
  ];

  const result = await helper.preparePurchasedInventoryItems(
    "token",
    "home",
    purchased,
    { predict, purchaseDate: "2026-10-01" }
  );

  assert.equal(result.withoutExpiry, 0);
  assert.equal(result.items[0].name, "Whole Milk");
  assert.equal(result.items[0].quantity, 2);
  assert.equal(result.items[0].unit, "cartons");
  assert.equal(result.items[0].storage_zone, "fridge");
  assert.equal(result.items[0].expiry_date, "2026-10-12");
  assert.equal(result.items[1].storage_zone, "pantry");
  assert.equal(result.items[1].expiry_date, "2027-02-01");
  assert.equal(calls.length, 3);
  assert.equal(calls[1].food_state, "unopened");
});

test("expiry prediction failures do not block a purchased item from being prepared", async () => {
  const helper = compileFile("src/lib/shoppingPantry.ts", {
    "./expiryPredictionApi": {
      predictExpiry: async () => {
        throw new Error("default should be replaced by injected predictor");
      },
    },
  });
  const purchased = [
    {
      id: "1",
      household_id: "home",
      food_id: null,
      name: "Unknown grocery",
      quantity: "not-a-number",
      unit: "",
      checked: true,
      created_at: "",
      updated_at: "",
    },
  ];

  const result = await helper.preparePurchasedInventoryItems(
    "token",
    "home",
    purchased,
    {
      predict: async () => {
        throw new Error("prediction unavailable");
      },
      purchaseDate: "2026-10-01",
    }
  );

  assert.equal(result.withoutExpiry, 1);
  assert.equal(result.items[0].quantity, 1);
  assert.equal(result.items[0].unit, "units");
  assert.equal(result.items[0].expiry_date, null);
  assert.equal(result.items[0].storage_zone, "pantry");
});
