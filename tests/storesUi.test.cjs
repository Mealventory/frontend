const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("Shopping surfaces household stores with CRUD, ordering, and browser links", () => {
  const source = fs.readFileSync("app/(app)/(tabs)/shopping.tsx", "utf8");

  assert.match(source, /Frequently shopped stores/);
  assert.match(source, /Add Store/);
  assert.match(source, /Save Changes/);
  assert.match(source, /label="Visit"/);
  assert.match(source, /label="Edit"/);
  assert.match(source, /label="Remove"/);
  assert.match(source, /label="Up"/);
  assert.match(source, /label="Down"/);
  assert.match(source, /listHouseholdStores/);
  assert.match(source, /addHouseholdStore/);
  assert.match(source, /updateHouseholdStore/);
  assert.match(source, /deleteHouseholdStore/);
  assert.match(source, /reorderHouseholdStores/);
  assert.match(source, /Linking\.openURL/);
  assert.match(source, /without requiring location access/);
});

test("store URL input is explicitly optional and validated before save/open", () => {
  const source = fs.readFileSync("app/(app)/(tabs)/shopping.tsx", "utf8");

  assert.match(source, /costco\.ca \(optional\)/);
  assert.match(source, /normalizeStoreUrl\(storeUrl\)/);
  assert.match(source, /valid http or https website URL/);
  assert.match(source, /normalizeStoreUrl\(store\.website_url\)/);
});
