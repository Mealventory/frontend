const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

function loadMealPlan() {
  const values = new Map();
  const secureStore = {
    getItemAsync: async (key) => values.get(key) ?? null,
    setItemAsync: async (key, value) => {
      values.set(key, value);
    },
    deleteItemAsync: async (key) => {
      values.delete(key);
    },
  };
  const source = fs.readFileSync("src/lib/mealPlan.ts", "utf8");
  const mod = new Module("mealPlan");
  mod.require = (name) => {
    if (name === "react-native") return { Platform: { OS: "ios" } };
    if (name === "expo-secure-store") return secureStore;
    throw new Error(`Unexpected import: ${name}`);
  };
  mod._compile(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    "mealPlan.cjs"
  );
  return { api: mod.exports, values };
}

const recipe = (id, name, uses) => ({
  id,
  name,
  time: "20 min",
  difficulty: "Easy",
  match: 0,
  uses,
  emoji: "🍽️",
  tag: "Dinner",
  description: `${name} description`,
  steps: ["Cook", "Serve"],
});

test("week helpers always build a Monday through Sunday week", () => {
  const { api } = loadMealPlan();
  const sunday = new Date(2026, 9, 4, 18, 0, 0);
  const monday = api.startOfWeek(sunday);
  assert.equal(api.localDateKey(monday), "2026-09-28");

  const dates = api.weekDates(monday).map(api.localDateKey);
  assert.deepEqual(dates, [
    "2026-09-28",
    "2026-09-29",
    "2026-09-30",
    "2026-10-01",
    "2026-10-02",
    "2026-10-03",
    "2026-10-04",
  ]);
  assert.equal(api.localDateKey(api.shiftWeek(monday, 1)), "2026-10-05");
  assert.equal(api.localDateKey(api.shiftWeek(monday, -1)), "2026-09-21");
});

test("ingredient readiness and weekly missing ingredients use pantry names case-insensitively", () => {
  const { api } = loadMealPlan();
  const pasta = recipe("1", "Pasta", ["Pasta", "Tomato", "Garlic"]);
  const salad = recipe("2", "Salad", ["Spinach", "Tomato"]);
  const inventory = new Set(["pasta", "TOMATO".toLowerCase()]);

  assert.equal(api.mealMatchPercent(pasta, inventory), 67);
  const missing = api.weeklyMissingIngredients(
    [
      { date: "2026-10-01", slot: "lunch", recipe: pasta },
      { date: "2026-10-02", slot: "dinner", recipe: salad },
    ],
    inventory
  );
  assert.deepEqual(missing, ["Garlic", "Spinach"]);
});

test("moving a meal into an empty slot preserves the recipe and clears the source", () => {
  const { api } = loadMealPlan();
  const pasta = recipe("1", "Pasta", ["Pasta"]);
  const meals = [{ date: "2026-10-01", slot: "lunch", recipe: pasta }];

  const next = api.applyMealMove(
    meals,
    "2026-10-01",
    "lunch",
    "2026-10-03",
    "dinner"
  );

  assert.equal(next.length, 1);
  assert.equal(next[0].date, "2026-10-03");
  assert.equal(next[0].slot, "dinner");
  assert.equal(next[0].recipe.name, "Pasta");
});

test("moving onto an occupied slot swaps the two planned meals", () => {
  const { api } = loadMealPlan();
  const pasta = recipe("1", "Pasta", ["Pasta"]);
  const soup = recipe("2", "Soup", ["Carrot"]);
  const meals = [
    { date: "2026-10-01", slot: "lunch", recipe: pasta },
    { date: "2026-10-02", slot: "dinner", recipe: soup },
  ];

  const next = api.applyMealMove(
    meals,
    "2026-10-01",
    "lunch",
    "2026-10-02",
    "dinner"
  );
  const byKey = new Map(
    next.map((meal) => [api.mealSlotKey(meal.date, meal.slot), meal])
  );

  assert.equal(byKey.get("2026-10-02:dinner").recipe.name, "Pasta");
  assert.equal(byKey.get("2026-10-01:lunch").recipe.name, "Soup");
});

test("meal plan persistence is isolated by user and household", async () => {
  const { api } = loadMealPlan();
  const pasta = recipe("1", "Pasta", ["Pasta"]);
  const meal = { date: "2026-10-01", slot: "dinner", recipe: pasta };

  await api.savePlannedMeal("user-a", "home-a", meal);

  assert.deepEqual(await api.loadMealPlan("user-a", "home-a"), [meal]);
  assert.deepEqual(await api.loadMealPlan("user-a", "home-b"), []);
  assert.deepEqual(await api.loadMealPlan("user-b", "home-a"), []);
});

test("persisted move swaps occupied slots and remove deletes only the selected meal", async () => {
  const { api } = loadMealPlan();
  const pasta = recipe("1", "Pasta", ["Pasta"]);
  const soup = recipe("2", "Soup", ["Carrot"]);

  await api.savePlannedMeal("user", "home", {
    date: "2026-10-01",
    slot: "lunch",
    recipe: pasta,
  });
  await api.savePlannedMeal("user", "home", {
    date: "2026-10-02",
    slot: "dinner",
    recipe: soup,
  });

  await api.movePlannedMeal(
    "user",
    "home",
    "2026-10-01",
    "lunch",
    "2026-10-02",
    "dinner"
  );

  let plan = await api.loadMealPlan("user", "home");
  let byKey = new Map(
    plan.map((meal) => [api.mealSlotKey(meal.date, meal.slot), meal])
  );
  assert.equal(byKey.get("2026-10-02:dinner").recipe.name, "Pasta");
  assert.equal(byKey.get("2026-10-01:lunch").recipe.name, "Soup");

  await api.removePlannedMeal("user", "home", "2026-10-01", "lunch");
  plan = await api.loadMealPlan("user", "home");
  assert.equal(plan.length, 1);
  assert.equal(plan[0].recipe.name, "Pasta");
});

test("meal planner route exposes week navigation, move mode, and weekly shopping action", () => {
  const source = fs.readFileSync("app/(app)/meal-plan.tsx", "utf8");
  assert.match(source, /Previous week/);
  assert.match(source, /Next week/);
  assert.match(source, /Meal picked up/);
  assert.match(source, /Move meal here/);
  assert.match(source, /Add Missing Week to Shopping/);
  assert.match(source, /Nothing planned this week/);
});

test("recipe entry points expose Meal Plan and Add to Meal Plan actions", () => {
  const recipes = fs.readFileSync("app/(app)/(tabs)/recipes.tsx", "utf8");
  const detail = fs.readFileSync("src/components/domain/RecipeDetailView.tsx", "utf8");
  assert.match(recipes, /label="Meal Plan"/);
  assert.match(detail, /Add to Meal Plan/);
});
