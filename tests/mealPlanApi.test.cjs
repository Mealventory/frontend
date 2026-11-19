const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

process.env.EXPO_PUBLIC_BACKEND_URL = "https://test.example";

function loadApi() {
  // Transpile the actual shared parser rather than stubbing validation.
  const mealPlan = new Module("mealPlan");
  mealPlan.require = (name) => {
    if (name === "react-native") return { Platform: { OS: "ios" } };
    if (name === "expo-secure-store") return {};
    throw new Error(`Unexpected import: ${name}`);
  };
  mealPlan._compile(ts.transpileModule(
    fs.readFileSync("src/lib/mealPlan.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }
  ).outputText, "mealPlan.cjs");

  const source = fs.readFileSync("src/lib/mealPlanApi.ts", "utf8");
  const mod = new Module("mealPlanApi");
  mod.require = (name) => {
    if (name === "./mealPlan") return mealPlan.exports;
    throw new Error(`Unexpected import: ${name}`);
  };
  mod._compile(ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText, "mealPlanApi.cjs");
  return mod.exports;
}

const api = loadApi();
const TOKEN = "fake.jwt";
const HOME = "20000000-0000-0000-0000-000000000001";
const RECIPE = {
  id: "r1", name: "Soup", time: "20 min", difficulty: "Easy",
  match: 100, uses: ["Carrot"], emoji: "🍲", tag: "Dinner",
  description: "Soup", steps: ["Cook"], servings: 4,
};

test("strict imported date validation rejects impossible calendar days", () => {
  assert.equal(api.validMealDate("2026-02-30"), false);
  assert.equal(api.validMealDate("2027-02-29"), false);
  assert.equal(api.validMealDate("2028-02-29"), true);
  assert.equal(api.validMealDate("2026-11-24"), true);
});

test("recipe snapshot sends only backend-approved fields", () => {
  const snapshot = api.recipeSnapshot(RECIPE);
  assert.equal(snapshot.name, "Soup");
  assert.equal(Object.hasOwn(snapshot, "servings"), false);
});

test("assignment sends a bearer token, household ID and revision", async () => {
  const previous = global.fetch;
  let captured;
  global.fetch = async (url, init) => {
    captured = { url, ...init };
    return {
      ok: true, status: 200, json: async () => ({
        meals: [], slot_versions: {}, imported_local_plan: false,
      }),
    };
  };
  try {
    await api.assignSharedMeal(TOKEN, HOME, {
      date: "2026-11-24", slot: "dinner", recipe: RECIPE,
    }, 2);
    assert.equal(captured.url, "https://test.example/api/v1/meal-plan/slots");
    assert.equal(captured.headers.Authorization, "Bearer " + TOKEN);
    assert.equal(captured.headers["X-Household-ID"], HOME);
    assert.equal(captured.method, "PUT");
    const payload = JSON.parse(captured.body);
    assert.equal(payload.expected_revision, 2);
    assert.equal(Object.hasOwn(payload.recipe, "servings"), false);
  } finally {
    global.fetch = previous;
  }
});

test("stale edits produce a specific conflict error", async () => {
  const previous = global.fetch;
  global.fetch = async () => ({ ok: false, status: 409 });
  try {
    await assert.rejects(
      api.assignSharedMeal(TOKEN, HOME, {
        date: "2026-11-24", slot: "dinner", recipe: RECIPE,
      }, 1),
      error => error instanceof api.MealPlanConflictError
    );
  } finally {
    global.fetch = previous;
  }
});

test("local import only forwards valid dates with version preconditions", () => {
  const request = api.importPayload([
    { date: "2026-11-24", slot: "lunch", recipe: RECIPE, expected_revision: 0 },
    { date: "2026-02-30", slot: "dinner", recipe: RECIPE, expected_revision: 0 },
  ]);
  assert.equal(request.import_key, "local-v1");
  assert.equal(request.meals.length, 1);
  assert.equal(request.meals[0].date, "2026-11-24");
  assert.equal(Object.hasOwn(request.meals[0].recipe, "servings"), false);
});

test("household API rejects malformed and impossible dates before network writes", async () => {
  const previous = global.fetch;
  let requests = 0;
  global.fetch = async () => {
    requests += 1;
    throw new Error("The API must not be called for invalid dates.");
  };
  try {
    for (const date of ["2027-02-29", "2026-02-30", "2026-00-15", "2026-11-00"]) {
      assert.throws(() => api.assignSharedMeal(TOKEN, HOME, {
        date, slot: "dinner", recipe: RECIPE,
      }, 0), RangeError);
      assert.throws(() => api.removeSharedMeal(TOKEN, HOME, date, "lunch", 0), RangeError);
      assert.throws(() => api.moveSharedMeal(
        TOKEN, HOME, "2026-11-24", "lunch", date, "dinner", 0, 0
      ), RangeError);
    }
    assert.equal(requests, 0);
  } finally {
    global.fetch = previous;
  }
});
