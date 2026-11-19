const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

const mod = new Module("activityFilters");
mod._compile(
  ts.transpileModule(fs.readFileSync("src/lib/activityFilters.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  "activityFilters.cjs",
);

const {
  ACTIVITY_ACTION_FILTERS,
  activityActorInitials,
  activityActorOptions,
  filterActivityEvents,
} = mod.exports;

const events = [
  { id: "first", actor_user_id: "member-a", actor_name: "Alex Li", action: "added" },
  { id: "second", actor_user_id: "member-b", actor_name: "Alex Li", action: "consumed" },
  { id: "third", actor_user_id: "member-a", actor_name: "Alex Li", action: "consumed" },
  { id: "fourth", actor_user_id: "former", actor_name: "Former Member", action: "shopping_added" },
];

test("all required activity types have their own filter pill", () => {
  assert.deepEqual(ACTIVITY_ACTION_FILTERS.map((item) => item.value), [
    "all", "added", "updated", "moved", "consumed", "discarded", "deleted", "shopping_added",
  ]);
});

test("filtering by member ID and action combines both filters without reordering", () => {
  assert.deepEqual(filterActivityEvents(events, "all", "all").map((x) => x.id), [
    "first", "second", "third", "fourth",
  ]);
  assert.deepEqual(filterActivityEvents(events, "consumed", "all").map((x) => x.id), [
    "second", "third",
  ]);
  assert.deepEqual(filterActivityEvents(events, "all", "member-a").map((x) => x.id), [
    "first", "third",
  ]);
  assert.deepEqual(filterActivityEvents(events, "consumed", "member-a").map((x) => x.id), [
    "third",
  ]);
  assert.deepEqual(filterActivityEvents(events, "discarded", "member-a"), []);
  assert.deepEqual(filterActivityEvents(events, "added", "member-b"), []);
});

test("member filters use stable user IDs even when display names match", () => {
  const options = activityActorOptions(events, [
    { user_id: "member-a", display_name: "Alex Li", avatar_url: "https://example.com/alex.png" },
    { user_id: "member-b", display_name: "Alex Li", avatar_url: null },
    { user_id: "member-c", username: "charlie", avatar_url: null },
  ]);
  assert.equal(options.length, 4);
  assert.equal(new Set(options.map((item) => item.userId)).size, 4);
  assert.deepEqual(options.map((item) => item.name), [
    "Alex Li", "Alex Li", "charlie", "Former Member",
  ]);
  assert.equal(options.find((item) => item.userId === "member-a").avatarUrl, "https://example.com/alex.png");
  assert.equal(options.find((item) => item.userId === "former").name, "Former Member");
});

test("member name fallback uses username, email prefix, event name, then generic label", () => {
  const options = activityActorOptions(
    [{ actor_user_id: "one", actor_name: "Recorded Name" }],
    [
      { user_id: "one", display_name: "  ", username: "", email: "" },
      { user_id: "two", display_name: null, username: null, email: "person@example.com" },
      { user_id: "three" },
    ],
  );
  assert.equal(options.find((item) => item.userId === "one").name, "Recorded Name");
  assert.equal(options.find((item) => item.userId === "two").name, "person");
  assert.equal(options.find((item) => item.userId === "three").name, "Household member");
});

test("initials handle one name, multiple names, and missing identity", () => {
  assert.equal(activityActorInitials("Alex Li"), "AL");
  assert.equal(activityActorInitials("Mia"), "MI");
  assert.equal(activityActorInitials(" Mary Ann Smith "), "MS");
  assert.equal(activityActorInitials(" "), "M");
  assert.equal(activityActorInitials(null), "M");
});

test("activity screen shows attribution and filters while keeping its recent-history limit clear", () => {
  const screen = fs.readFileSync("app/(app)/activity.tsx", "utf8");
  assert.match(screen, /getHouseholdMembers\(household\.id, session\.access_token\)/);
  assert.match(screen, /fetchHouseholdActivity\(\s*session\.access_token,\s*household\.id,\s*100,?\s*\)/);
  assert.match(screen, /filterActivityEvents\(events, actionFilter, actorFilter\)/);
  assert.match(screen, /<Avatar/);
  assert.match(screen, /activityActorInitials\(actorName\)/);
  assert.match(screen, /accessibilityState=\{\{ selected \}\}/);
  assert.match(screen, /No matching activity/);
  assert.match(screen, /Showing up to 100 latest events/);
});
