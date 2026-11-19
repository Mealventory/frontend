const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const screen = fs.readFileSync("app/(app)/meal-plan.tsx", "utf8");

test("tapping an empty meal slot opens a visible recipe-picker modal", () => {
  assert.match(screen, /onPress=\{\(\) => void chooseSlot\(\{ date: dateKey, slot \}\)\}/);
  assert.match(screen, /setPickerTarget\(target\)/);
  assert.match(screen, /\{!!pickerTarget && \(\s*<Modal\s+visible\s+transparent/);
  assert.match(screen, /onRequestClose=\{\(\) => setPickerTarget\(null\)\}/);

  const modalStart = screen.indexOf("{!!pickerTarget && (");
  const modalEnd = screen.indexOf("</Modal>", modalStart);
  assert.ok(modalEnd > modalStart, "Picker must close inside its modal");
  const modal = screen.slice(modalStart, modalEnd);
  assert.match(modal, /Choose a recipe/);
  assert.match(modal, /recipeChoices\.map/);
  assert.match(modal, /onPress=\{\(\) => void assignRecipe\(pickerTarget, recipe\)\}/);
});

test("picker includes an empty-state route and immediate error feedback", () => {
  const modal = screen.slice(screen.indexOf("{!!pickerTarget && ("), screen.indexOf("</Modal>"));
  assert.match(modal, /Save a recipe first/);
  assert.match(modal, /setPickerTarget\(null\);\s*router\.push/);
  assert.match(modal, /accessibilityRole="alert"/);
});
