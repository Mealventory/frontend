const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

function compileSavedRecipes() {
  const storage = new Map();
  globalThis.localStorage = {
    getItem: (key) => (storage.has(key) ? storage.get(key) : null),
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  };

  const source = fs.readFileSync("src/lib/savedRecipes.ts", "utf8");
  const mod = new Module("savedRecipes");
  mod.require = (name) => {
    if (name === "react-native") return { Platform: { OS: "web" } };
    if (name === "expo-secure-store") {
      return {
        getItemAsync: async () => null,
        setItemAsync: async () => {},
        deleteItemAsync: async () => {},
      };
    }
    return require(name);
  };
  mod._compile(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    "savedRecipes.cjs"
  );
  return { api: mod.exports, storage };
}

const recipe = {
  id: "generated-1",
  name: "Carrot Soup",
  time: "30 min",
  difficulty: "Easy",
  match: 80,
  uses: ["Carrot", "Salt"],
  emoji: "🍲",
  tag: "Your pantry",
  description: "Use carrots soon",
  steps: ["Cook carrots", "Blend"],
  priorityIngredients: ["Carrot"],
  missingIngredients: ["Salt"],
};

test("recipe save key is stable across generated ids and ingredient ordering", () => {
  const { api } = compileSavedRecipes();
  const sameRecipe = {
    ...recipe,
    id: "generated-999",
    uses: ["Salt", "Carrot"],
  };
  assert.equal(api.recipeSaveKey(recipe), api.recipeSaveKey(sameRecipe));
});

test("saved recipe snapshots persist, update, and remove within user-household scope", async () => {
  const { api } = compileSavedRecipes();

  await api.saveRecipe("user-1", "home-1", recipe);
  let saved = await api.loadSavedRecipes("user-1", "home-1");
  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, "Carrot Soup");

  const refreshedSnapshot = {
    ...recipe,
    id: "generated-2",
    description: "Updated recipe snapshot",
  };
  await api.saveRecipe("user-1", "home-1", refreshedSnapshot);
  saved = await api.loadSavedRecipes("user-1", "home-1");
  assert.equal(saved.length, 1);
  assert.equal(saved[0].id, "generated-2");
  assert.equal(saved[0].description, "Updated recipe snapshot");

  assert.deepEqual(await api.loadSavedRecipes("user-1", "home-2"), []);

  await api.removeSavedRecipe("user-1", "home-1", recipe);
  assert.deepEqual(await api.loadSavedRecipes("user-1", "home-1"), []);
});
