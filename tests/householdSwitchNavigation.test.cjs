const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const settings = fs.readFileSync("app/(app)/(tabs)/settings.tsx", "utf8");
const selector = fs.readFileSync("app/households.tsx", "utf8");
const entry = fs.readFileSync("app/index.tsx", "utf8");
const layout = fs.readFileSync("app/_layout.tsx", "utf8");
const auth = fs.readFileSync("src/context/AuthContext.tsx", "utf8");

test("Settings opens an unambiguous route to the original household screen", () => {
  const switchButton = settings.slice(
    settings.indexOf('label="Switch / Manage Households"'),
    settings.indexOf('testID="e2e-log-out"'),
  );
  assert.ok(switchButton.includes('router.push("/households" as any)'));
  assert.ok(!switchButton.includes('router.replace("/"'));
  assert.ok(layout.includes('<Stack.Screen name="households" />'));
  assert.ok(selector.includes('import HouseholdScreen from "./index"'));
  assert.ok(selector.includes('<HouseholdScreen forceManageHouseholds />'));
  assert.ok(!selector.includes("StyleSheet") && !selector.includes("ScrollView"));
});

test("active household is not allowed to redirect the household selector", () => {
  assert.ok(entry.includes("forceManageHouseholds = false"));
  assert.ok(entry.includes("const manageHouseholds = forceManageHouseholds || manageParam === '1'"));
  const guard = entry.slice(
    entry.indexOf("!session?.user.id ||", entry.indexOf("const manageHouseholds")),
    entry.indexOf("router.replace('/(app)/(tabs)'"),
  );
  assert.ok(guard.includes("!activeHousehold ||"));
  assert.ok(guard.includes("manageHouseholds ||"));
});

test("original household selector retains the exact compact home design", () => {
  assert.ok(entry.includes('<Text style={styles.title}>Your household.</Text>'));
  assert.ok(entry.includes('<Text style={styles.subtitle}>A home for your shared kitchen.</Text>'));
  assert.ok(entry.includes("households.length > 1 &&"));
  assert.ok(entry.includes("horizontal showsHorizontalScrollIndicator={false}"));
  assert.ok(entry.includes("style={[styles.chip, selected.id === household.id && styles.selectedChip]}"));
  assert.ok(entry.includes('<HouseholdInviteCard'));
  assert.ok(entry.includes('title="Create a household"'));
  assert.ok(entry.includes('title="Join with an invite code"'));
  assert.ok(entry.includes("selectHousehold(selected); router.push('/(app)/(tabs)'"));
  assert.ok(!entry.includes("Your kitchens"));
  assert.ok(!entry.includes("Back to kitchen"));
});

test("switching screens does not clear the authenticated or saved kitchen", () => {
  assert.ok(auth.includes("appStorage.setItem(key, JSON.stringify(next))"));
  assert.ok(auth.includes("appStorage.getItem(key)"));
  assert.ok(auth.includes("const selectHousehold = useCallback"));
  assert.ok(!settings.includes("selectHousehold(null)"));
  assert.ok(!selector.includes("selectHousehold(null)"));
});
