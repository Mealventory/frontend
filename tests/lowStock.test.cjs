const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

function loadInventoryApi() {
  process.env.EXPO_PUBLIC_BACKEND_URL = "https://backend.example";
  const source = fs.readFileSync("src/lib/inventoryApi.ts", "utf8");
  const mod = new Module("inventoryApi");
  mod._compile(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    "inventoryApi.cjs"
  );
  return mod.exports;
}

test("inventory rows preserve low-stock tracking metadata", () => {
  const api = loadInventoryApi();
  const item = api.toFoodItem({
    id: "item-1",
    household_id: "home-1",
    name: "Flour",
    category: "Pantry",
    quantity: "0.2",
    remaining_percent: "10.0",
    is_low_stock: true,
    unit: "kg",
    expiry_date: null,
    status: "active",
    storage_zone: "pantry",
  });

  assert.equal(item.quantity, "0.2 kg");
  assert.equal(item.remainingPercent, 10);
  assert.equal(item.isLowStock, true);
});

test("edit screen keeps low-stock tracking automatic", () => {
  const source = fs.readFileSync("app/(app)/inventory/edit.tsx", "utf8");

  assert.match(source, /Low-stock tracking is automatic/);
  assert.match(source, /warns at 10% remaining/);
  assert.doesNotMatch(source, /Track quantity for low stock/);
  assert.doesNotMatch(source, /Reference quantity/);
  assert.doesNotMatch(source, /Low-stock threshold \(%\)/);
  assert.doesNotMatch(source, /quantity_tracking_enabled/);
});

test("home hides quantity percentage while item detail shows it", () => {
  const card = fs.readFileSync("src/components/domain/PantryItemCard.tsx", "utf8");
  const dashboard = fs.readFileSync("app/(app)/(tabs)/index.tsx", "utf8");
  const detail = fs.readFileSync("app/(app)/inventory/[id].tsx", "utf8");

  assert.doesNotMatch(card, /remainingPercent/);
  assert.doesNotMatch(dashboard, /Low stock/);
  assert.doesNotMatch(dashboard, /Add to Shopping/);
  assert.match(detail, /item\.remainingPercent/);
  assert.match(detail, /Mealventory warns automatically at 10% remaining/);
});
