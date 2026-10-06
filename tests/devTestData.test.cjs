const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

const source = fs.readFileSync("src/lib/devTestData.ts", "utf8");
const mod = new Module("devTestData");
mod._compile(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  "devTestData.cjs"
);

const { buildDevTestPantry, missingDevTestPantryItems } = mod.exports;

test("development pantry covers recipe, expiry, and storage test cases", () => {
  const now = new Date("2026-10-01T12:00:00");
  const items = buildDevTestPantry(now);
  const byName = Object.fromEntries(items.map((item) => [item.name, item]));

  assert.equal(byName["Chicken Breast"].expiry_date, "2026-10-01");
  assert.equal(byName["Greek Yogurt"].expiry_date, "2026-09-29");
  assert.equal(byName["Baby Spinach"].expiry_date, "2026-10-02");
  assert.equal(byName["Frozen Peas"].expiry_date, null);
  assert.equal(byName["Frozen Peas"].storage_zone, "freezer");
  assert.equal(byName["Pasta Penne"].storage_zone, "pantry");
});

test("development pantry loader skips names already in the household", () => {
  const items = missingDevTestPantryItems(
    ["chicken breast", "WHOLE MILK", "Existing Item"],
    new Date("2026-10-01T12:00:00")
  );
  const names = items.map((item) => item.name);

  assert.equal(names.includes("Chicken Breast"), false);
  assert.equal(names.includes("Whole Milk"), false);
  assert.equal(names.includes("Garlic"), true);
});
