const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const settings = fs.readFileSync("app/(app)/(tabs)/settings.tsx", "utf8");
const entry = fs.readFileSync("app/index.tsx", "utf8");
const auth = fs.readFileSync("src/context/AuthContext.tsx", "utf8");
const layout = fs.readFileSync("app/_layout.tsx", "utf8");

test("Settings routes to the original household page with selection mode enabled", () => {
  assert.match(settings, /label="Switch \/ Manage Households"[\s\S]*?openHouseholdSelection\(\);[\s\S]*?router\.replace\("\/" as any\)/);
  assert.match(auth, /const \[choosingHousehold, setChoosingHousehold\] = useState\(false\)/);
  assert.match(auth, /openHouseholdSelection = useCallback\(\(\) => setChoosingHousehold\(true\)/);
  assert.match(entry, /const manageHouseholds = choosingHousehold/);
  assert.doesNotMatch(layout, /<Stack\.Screen name="households"/);
  assert.equal(fs.existsSync("app/households.tsx"), false);
});

test("active kitchen never redirects while a user is choosing households", () => {
  assert.match(entry, /!activeHousehold \|\|[\s\S]*?manageHouseholds \|\|[\s\S]*?router\.replace\('\/\(app\)\/\(tabs\)'/);
  assert.match(auth, /const selectHousehold = useCallback\([\s\S]*?if \(next\) setChoosingHousehold\(false\)/);
  assert.match(auth, /if \(next\) appStorage\.setItem\(key, JSON\.stringify\(next\)\)/);
  const openPicker = auth.slice(auth.indexOf("const openHouseholdSelection"), auth.indexOf("const selectHousehold"));
  assert.doesNotMatch(openPicker, /setHousehold\(|appStorage\./);
});

test("original household choice page keeps its compact selector and controls", () => {
  assert.match(entry, /<Text style=\{styles\.title\}>Your household\.<\/Text>/);
  assert.match(entry, /<Text style=\{styles\.subtitle\}>A home for your shared kitchen\.<\/Text>/);
  assert.match(entry, /households\.length > 1 && \(/);
  assert.match(entry, /<ScrollView\s+horizontal\s+showsHorizontalScrollIndicator=\{false\}/);
  assert.match(entry, /households\.map\(kitchen =>/);
  assert.match(entry, /onPress=\{\(\) => setSelected\(kitchen\)\}/);
  assert.match(entry, /style=\{\[styles\.chip, selected\.id === kitchen\.id && styles\.selectedChip\]\}/);
  assert.doesNotMatch(entry, />Your kitchens<|\(Current\)|Back to kitchen/);
  assert.match(entry, /onPress=\{\(\) => \{ selectHousehold\(selected\); router\.push\('\/\(app\)\/\(tabs\)'/);
  assert.match(entry, /<Action title="Create a household"/);
  assert.match(entry, /<Action title="Join with an invite code"/);
});

test("picker mode is cleared on sign out or when accounts change", () => {
  assert.match(auth, /if \(previousUserId !== next\?\.user\.id\) \{\s*setChoosingHousehold\(false\)/);
  assert.match(auth, /if \(event === 'SIGNED_OUT'\) \{\s*setChoosingHousehold\(false\)/);
  assert.match(auth, /const signOutE2E[\s\S]*?setChoosingHousehold\(false\)/);
});
