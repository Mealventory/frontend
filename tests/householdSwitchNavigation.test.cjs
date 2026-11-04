const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const settings = fs.readFileSync("app/(app)/(tabs)/settings.tsx", "utf8");
const manager = fs.readFileSync("app/households.tsx", "utf8");
const entry = fs.readFileSync("app/index.tsx", "utf8");
const layout = fs.readFileSync("app/_layout.tsx", "utf8");

test("Settings opens a dedicated household management route", () => {
  assert.match(settings, /label="Switch \/ Manage Households"[\s\S]*?router\.push\("\/households"/);
  assert.doesNotMatch(settings, /pathname: "\/"[\s\S]*?manage: "1"/);
  assert.match(layout, /<Stack\.Screen name="households" \/>/);
  assert.match(manager, /<HouseholdScreen forceManageHouseholds \/>/);
});

test("active kitchen does not redirect away from the household manager", () => {
  assert.match(entry, /const manageHouseholds = forceManageHouseholds \|\| manageParam === '1'/);
  assert.match(entry, /!activeHousehold \|\|[\s\S]*?manageHouseholds \|\|[\s\S]*?router\.replace\('\/\(app\)\/\(tabs\)'/);
  assert.match(entry, /router\.replace\('\/\(app\)\/\(tabs\)' as any\)/);
});

test("household manager lists all kitchens and enters only the selected one", () => {
  assert.match(entry, /manageHouseholds \? \([\s\S]*?households\.map\(kitchen =>/);
  assert.match(entry, /accessibilityLabel=\{`Select \$\{kitchen\.name\} kitchen`\}/);
  assert.match(entry, /onPress=\{\(\) => setSelected\(kitchen\)\}/);
  assert.match(entry, /activeHousehold\?\.id === kitchen\.id \? ' \(Current\)'/);
  assert.match(entry, /onPress=\{\(\) => \{ selectHousehold\(selected\); router\.push\('\/\(app\)\/\(tabs\)'/);
  assert.match(entry, /<Action title="Create a household"/);
  assert.match(entry, /<Action title="Join with an invite code"/);
});
