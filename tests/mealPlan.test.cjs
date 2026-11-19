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
  const expiry = new Module("pantryExpiry");
  expiry._compile(
    ts.transpileModule(fs.readFileSync("src/lib/pantryExpiry.ts", "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    "pantryExpiry.cjs"
  );
  const source = fs.readFileSync("src/lib/mealPlan.ts", "utf8");
  const mod = new Module("mealPlan");
  mod.require = (name) => {
    if (name === "react-native") return { Platform: { OS: "ios" } };
    if (name === "expo-secure-store") return secureStore;
    if (name === "./pantryExpiry") return expiry.exports;
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

test("ingredient readiness separates pantry gaps, shopping coverage, and unresolved needs", () => {
  const { api } = loadMealPlan();
  const pasta = recipe("1", "Pasta", ["Pasta", "Tomato", "Garlic"]);
  const salad = recipe("2", "Salad", ["Spinach", "Tomato"]);
  const inventory = new Set(["pasta", "TOMATO".toLowerCase()]);
  const shopping = new Set(["garlic"]);

  assert.equal(api.mealMatchPercent(pasta, inventory), 67);
  assert.deepEqual(
    api.mealIngredientReadiness(pasta, inventory, shopping),
    {
      status: "low",
      matchPercent: 67,
      missingIngredients: ["Garlic"],
      shoppingCoveredIngredients: ["Garlic"],
      unresolvedIngredients: [],
    }
  );

  assert.deepEqual(
    api.mealIngredientReadiness(
      recipe("3", "Soup", ["Carrot", "Celery"]),
      new Set(),
      new Set(["celery"])
    ),
    {
      status: "missing",
      matchPercent: 0,
      missingIngredients: ["Carrot", "Celery"],
      shoppingCoveredIngredients: ["Celery"],
      unresolvedIngredients: ["Carrot"],
    }
  );

  assert.deepEqual(
    api.mealIngredientReadiness(
      recipe("4", "Toast", ["Bread"]),
      new Set(["bread"]),
      new Set()
    ),
    {
      status: "ready",
      matchPercent: 100,
      missingIngredients: [],
      shoppingCoveredIngredients: [],
      unresolvedIngredients: [],
    }
  );

  const missing = api.weeklyMissingIngredients(
    [
      { date: "2026-10-01", slot: "lunch", recipe: pasta },
      { date: "2026-10-02", slot: "dinner", recipe: salad },
    ],
    inventory
  );
  assert.deepEqual(missing, ["Garlic", "Spinach"]);
});

test("saved recipe pantry helpers exclude expired and invalid dates and match the three-day window", () => {
  const { api } = loadMealPlan();
  const recipeWithWhitespace = recipe("soon", "Soon", ["  SPINACH ", "Milk", "Bread", "Eggs"]);
  const pantry = [
    { name: "Spinach", expiryDate: "2026-11-19" },
    { name: "Milk", expiryDate: "2026-11-22" },
    { name: "Bread", expiryDate: "2026-11-23" },
    { name: "Eggs", expiryDate: "not-a-date" },
    { name: "Cheese", expiryDate: "2026-11-18" },
  ];

  assert.deepEqual(
    api.eligiblePantryItems(pantry, "2026-11-19").map((item) => item.name),
    ["Spinach", "Milk", "Bread"]
  );
  assert.deepEqual(
    api.expiringRecipeIngredients(recipeWithWhitespace, pantry, "2026-11-19"),
    ["SPINACH", "Milk"]
  );
  assert.deepEqual(
    api.mealIngredientReadiness(recipeWithWhitespace, api.eligiblePantryItems(pantry, "2026-11-19")).missingIngredients,
    ["Eggs"]
  );
});

test("upcoming readiness warnings include only unresolved meals in the lead window", () => {
  const { api } = loadMealPlan();
  const today = new Date(2026, 9, 2, 12, 0, 0);
  const meals = [
    {
      date: "2026-10-01",
      slot: "dinner",
      recipe: recipe("past", "Past", ["Garlic"]),
    },
    {
      date: "2026-10-02",
      slot: "dinner",
      recipe: recipe("today", "Today", ["Pasta", "Garlic"]),
    },
    {
      date: "2026-10-03",
      slot: "lunch",
      recipe: recipe("tomorrow", "Tomorrow", ["Spinach"]),
    },
    {
      date: "2026-10-04",
      slot: "dinner",
      recipe: recipe("soon", "Soon", ["Chicken"]),
    },
    {
      date: "2026-10-05",
      slot: "dinner",
      recipe: recipe("later", "Later", ["Rice"]),
    },
  ];

  assert.equal(api.isMealDateWithinWarningWindow("2026-10-02", today), true);
  assert.equal(api.isMealDateWithinWarningWindow("2026-10-04", today), true);
  assert.equal(api.isMealDateWithinWarningWindow("2026-10-05", today), false);
  assert.equal(api.isMealDateWithinWarningWindow("2026-10-01", today), false);

  const warnings = api.upcomingMealReadinessWarnings(
    meals,
    new Set(["pasta"]),
    new Set(["spinach"]),
    today
  );

  assert.deepEqual(
    warnings.map(({ meal, readiness }) => ({
      id: meal.recipe.id,
      unresolved: readiness.unresolvedIngredients,
    })),
    [
      { id: "today", unresolved: ["Garlic"] },
      { id: "soon", unresolved: ["Chicken"] },
    ]
  );
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

test("meal planner route exposes readiness warnings and duplicate-safe shopping actions", () => {
  const source = fs.readFileSync("app/(app)/meal-plan.tsx", "utf8");
  assert.match(source, /Previous week/);
  assert.match(source, /Next week/);
  assert.match(source, /Meal picked up/);
  assert.match(source, /Move meal here/);
  assert.match(source, /Missing from pantry:/);
  assert.match(source, /On Shopping:/);
  assert.match(source, /Needs shopping soon/);
  assert.match(source, /Upcoming meals need shopping/);
  assert.match(source, /Meal times are not stored yet/);
  assert.match(source, /Add Missing to Shopping/);
  assert.match(source, /Add Missing Week to Shopping/);
  assert.match(source, /listShoppingItems/);
  assert.match(source, /Nothing planned this week/);
});

test("recipe entry points expose Meal Plan and Add to Meal Plan actions", () => {
  const recipes = fs.readFileSync("app/(app)/(tabs)/recipes.tsx", "utf8");
  const detail = fs.readFileSync("src/components/domain/RecipeDetailView.tsx", "utf8");
  assert.match(recipes, /label="Meal Plan"/);
  assert.match(detail, /Add to Meal Plan/);
});


test("strict meal plan calendar dates reject impossible days and accept leap years", () => {
  const { api } = loadMealPlan();
  for (const invalid of [
    "2027-02-29", "2026-02-30", "2026-00-10", "2026-01-00",
    "2026-13-01", "2026-04-31", "2026-2-09", "0099-12-31",
  ]) {
    assert.equal(api.validMealDate(invalid), false, invalid);
    assert.equal(api.parseMealDateKey(invalid), null, invalid);
    assert.throws(() => api.parseLocalDateKey(invalid), RangeError);
    assert.throws(() => api.mealSlotKey(invalid, "lunch"), RangeError);
    assert.equal(api.isMealDateWithinWarningWindow(invalid, new Date(2026, 1, 28, 12)), false);
  }
  for (const valid of ["2028-02-29", "2024-02-29", "2026-11-19", "2026-12-31"]) {
    assert.equal(api.validMealDate(valid), true, valid);
    assert.equal(api.localDateKey(api.parseLocalDateKey(valid)), valid);
  }
});

test("warning window uses calendar days even across DST and timezone changes", () => {
  const originalTimezone = process.env.TZ;
  try {
    for (const timezone of ["America/Toronto", "Pacific/Auckland", "UTC"]) {
      process.env.TZ = timezone;
      const { api } = loadMealPlan();
      for (const today of ["2026-03-07", "2026-10-31"]) {
        const current = api.parseLocalDateKey(today);
        const tomorrow = new Date(current);
        tomorrow.setDate(current.getDate() + 1);
        const next = api.localDateKey(tomorrow);
        assert.equal(api.isMealDateWithinWarningWindow(next, current, 1), true, timezone);
        assert.equal(api.localDateKey(api.parseLocalDateKey(today)), today, timezone);
        assert.equal(api.localDateKey(api.parseLocalDateKey(next)), next, timezone);
      }
    }
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test("corrupted legacy plans are skipped without moving them to another day", async () => {
  const { api, values } = loadMealPlan();
  const prefix = "mealventory.mealPlan.corrupt-user.corrupt-home";
  const invalid = "2026-02-30:lunch";
  const validLeap = "2028-02-29:dinner";
  const mismatched = "2026-11-01:lunch";
  const validNormal = "2026-11-02:dinner";
  values.set(`${prefix}.index`, JSON.stringify([invalid, validLeap, mismatched, validNormal]));
  values.set(`${prefix}.2026-02-30.lunch`, JSON.stringify({
    date: "2026-02-30", slot: "lunch", recipe: recipe("bad", "Invalid", ["Rice"]),
  }));
  values.set(`${prefix}.2028-02-29.dinner`, JSON.stringify({
    date: "2028-02-29", slot: "dinner", recipe: recipe("leap", "Leap", ["Rice"]),
  }));
  values.set(`${prefix}.2026-11-01.lunch`, JSON.stringify({
    date: "2026-11-02", slot: "lunch", recipe: recipe("wrong-key", "Mismatch", ["Rice"]),
  }));
  values.set(`${prefix}.2026-11-02.dinner`, JSON.stringify({
    date: "2026-11-02", slot: "dinner", recipe: recipe("normal", "Normal", ["Rice"]),
  }));

  const restored = await api.loadMealPlan("corrupt-user", "corrupt-home");
  assert.deepEqual(restored.map(item => item.recipe.id), ["leap", "normal"]);
  assert.deepEqual(JSON.parse(values.get(`${prefix}.index`)), [validLeap, validNormal]);
});

test("invalid local meal writes and moves fail before changing saved data", async () => {
  const { api, values } = loadMealPlan();
  const user = "writer";
  const home = "home";
  await assert.rejects(api.savePlannedMeal(user, home, {
    date: "2026-02-30", slot: "dinner", recipe: recipe("bad", "Bad", ["Rice"]),
  }), RangeError);
  assert.equal(values.size, 0);

  await api.savePlannedMeal(user, home, {
    date: "2026-11-19", slot: "lunch", recipe: recipe("good", "Good", ["Rice"]),
  });
  const before = new Map(values);
  await assert.rejects(
    api.movePlannedMeal(user, home, "2026-11-19", "lunch", "2027-02-29", "dinner"),
    RangeError
  );
  assert.deepEqual([...values], [...before]);
  assert.deepEqual((await api.loadMealPlan(user, home)).map(item => item.recipe.id), ["good"]);
});
