const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

const swipe = fs.readFileSync(
  "src/components/molecules/SwipeActionRow.tsx",
  "utf8"
);
const pantry = fs.readFileSync(
  "src/components/domain/PantryItemCard.tsx",
  "utf8"
);
const shopping = fs.readFileSync(
  "app/(app)/(tabs)/shopping.tsx",
  "utf8"
);

test("swipe row requires deliberate horizontal intent and only reveals actions", () => {
  assert.match(swipe, /HORIZONTAL_INTENT_PX = 8/);
  assert.match(swipe, /horizontal > vertical \* 1\.4/);
  assert.match(swipe, /OPEN_THRESHOLD = 0\.32/);
  assert.match(swipe, /gesture\.vx < -0\.45/);

  // Releasing a swipe only opens/closes the row; actions run from explicit buttons.
  assert.match(swipe, /if \(shouldOpen\) open\(\);/);
  assert.match(swipe, /onPress=\{\(\) => void invoke\(action\)\}/);
});

test("swipe actions have an internal duplicate-action lock", () => {
  assert.match(swipe, /const actionLocked = useRef\(false\)/);
  assert.match(
    swipe,
    /if \(disabled \|\| action\.disabled \|\| actionLocked\.current\) return/
  );
  assert.match(swipe, /actionLocked\.current = true/);
  assert.match(swipe, /actionLocked\.current = false/);
});

test("pantry swipe actions map to existing consume and discard transitions", () => {
  assert.match(pantry, /key:'consume'/);
  assert.match(pantry, /onPress:\(\)=>save\(null,'consume'\)/);
  assert.match(pantry, /key:'discard'/);
  assert.match(pantry, /onPress:\(\)=>save\(null,'discard'\)/);

  // Existing per-card lock remains in place in addition to the swipe-row lock.
  assert.match(pantry, /if\(locked\.current\)return/);
});

test("shopping swipe actions reuse purchased toggle and delete APIs", () => {
  assert.match(shopping, /deleteShoppingItem/);
  assert.match(shopping, /key: "purchased"/);
  assert.match(shopping, /onPress: \(\) => toggleItem\(item\)/);
  assert.match(shopping, /key: "delete"/);
  assert.match(shopping, /onPress: \(\) => deleteItem\(item\)/);
  assert.match(shopping, /key: "to-buy"/);

  // Both toggle and delete handlers reject duplicate row mutations.
  const busyGuards = shopping.match(
    /if \(!session \|\| !household \|\| busyId \|\| moving\) return;/g
  );
  assert.ok(busyGuards && busyGuards.length >= 2);
});

test("shopping delete rolls back optimistic removal on failure", () => {
  assert.match(shopping, /const previous = items;/);
  assert.match(
    shopping,
    /setItems\(\(current\) => current\.filter\(\(row\) => row\.id !== item\.id\)\)/
  );
  assert.match(shopping, /setItems\(previous\)/);
  assert.match(shopping, /Could not remove the shopping item/);
});
