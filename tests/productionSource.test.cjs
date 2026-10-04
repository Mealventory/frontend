const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("Expo Router is the only production screen tree", () => {
  assert.equal(fs.existsSync("App template"), false);
  assert.equal(fs.existsSync("src/screens"), false);

  const root = fs.readFileSync("app/index.tsx", "utf8");
  assert.match(root, /export default function HouseholdScreen/);
  assert.doesNotMatch(root, /src\/screens/);
});

test("TypeScript config no longer carries a legacy prototype exclusion", () => {
  const config = JSON.parse(fs.readFileSync("tsconfig.json", "utf8"));
  assert.ok(!(config.exclude || []).includes("App template"));
});
