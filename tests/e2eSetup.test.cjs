const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("E2E mode is explicit and uses non-production fixtures", () => {
  const e2e = fs.readFileSync("src/lib/e2e.ts", "utf8");
  const env = fs.readFileSync(".env.example", "utf8");

  assert.ok(e2e.includes('process.env.EXPO_PUBLIC_E2E_MODE === "1"'));
  assert.ok(e2e.includes('e2e@mealventory.test'));
  assert.ok(e2e.includes('E2E Test Kitchen'));
  assert.ok(env.includes("EXPO_PUBLIC_E2E_MODE=0"));
  assert.ok(!e2e.includes("EXPO_PUBLIC_SUPABASE"));
});

test("normal providers only use the in-memory path under the E2E flag", () => {
  const root = fs.readFileSync("app/_layout.tsx", "utf8");
  const auth = fs.readFileSync("src/context/AuthContext.tsx", "utf8");
  const inventory = fs.readFileSync("src/context/InventoryContext.tsx", "utf8");
  const notifications = fs.readFileSync("src/context/NotificationContext.tsx", "utf8");

  assert.ok(root.includes("<InventoryProvider demo={E2E_ENABLED}>"));
  assert.ok(auth.includes("if (E2E_ENABLED || !supabase) return;"));
  assert.ok(auth.includes("E2E_ENABLED ? false : initialRecovery"));
  assert.ok(auth.includes("if (!E2E_ENABLED) return false;"));
  assert.ok(inventory.includes("if (demo) {"));
  assert.ok(notifications.includes("if (e2eMode || unavailable || !user)"));
  assert.ok(inventory.includes("const updateDemoItem"));
});

test("package exposes one Maestro smoke-suite command", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  assert.equal(pkg.scripts["test:e2e"], "maestro test .maestro");
});

test("critical Maestro journey covers sign-in, household, pantry mutation, and sign-out", () => {
  const flow = fs.readFileSync(".maestro/critical-journey.yaml", "utf8");

  for (const id of [
    "e2e-email",
    "e2e-password",
    "e2e-sign-in",
    "e2e-enter-kitchen",
    "e2e-add-manual",
    "e2e-item-name",
    "e2e-add-to-kitchen",
    "e2e-edit-item",
    "e2e-save-edit",
    "e2e-consume-item",
    "tab-settings",
    "e2e-log-out",
  ]) {
    assert.ok(flow.includes(id), `missing Maestro step for ${id}`);
  }

  assert.ok(flow.includes("E2E Apples Edited"));
  assert.ok(flow.includes("assertNotVisible"));
});

test("scanner Maestro flow is deterministic and camera-independent", () => {
  const flow = fs.readFileSync(".maestro/scanner-review.yaml", "utf8");
  const scan = fs.readFileSync("app/(app)/(tabs)/scan.tsx", "utf8");

  assert.ok(flow.includes("e2e-product-review"));
  assert.ok(flow.includes("e2e-barcode-review"));
  assert.ok(flow.includes("E2E Greek Yogurt"));
  assert.ok(flow.includes("Item (012345678905)"));
  assert.ok(scan.includes("if (e2eMode)"));
  assert.ok(scan.includes("E2E_PRODUCT_SCAN_ITEMS"));
  assert.ok(scan.includes("E2E_BARCODE_SCAN_ITEMS"));
});

test("E2E documentation warns against enabling fixture mode in normal builds", () => {
  const doc = fs.readFileSync("docs/e2e-mobile.md", "utf8");
  assert.ok(doc.includes("npm run test:e2e"));
  assert.ok(doc.includes("Do not set `EXPO_PUBLIC_E2E_MODE=1`"));
  assert.ok(doc.includes("production Supabase credentials"));
});
