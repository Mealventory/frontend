const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

process.env.EXPO_PUBLIC_BACKEND_URL = "https://backend.example";

const mod = new Module("activityApi");
mod._compile(
  ts.transpileModule(fs.readFileSync("src/lib/activityApi.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  "activityApi.cjs",
);

const {
  fetchHouseholdActivity,
  activityDescription,
  relativeActivityTime,
} = mod.exports;

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

test("activity request is authenticated and household scoped", async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, "https://backend.example/api/v1/activity?limit=50");
    assert.equal(options.headers.Authorization, "Bearer token");
    assert.equal(options.headers["X-Household-ID"], "home");
    return new Response(JSON.stringify([{ id: "event-1" }]), { status: 200 });
  };
  const events = await fetchHouseholdActivity("token", "home");
  assert.equal(events[0].id, "event-1");
});

test("activity descriptions stay compact and human readable", () => {
  const base = { item_name: "Milk" };
  assert.equal(activityDescription({ ...base, action: "added" }), "added Milk");
  assert.equal(activityDescription({ ...base, action: "moved" }), "moved Milk");
  assert.equal(
    activityDescription({ ...base, action: "consumed" }),
    "marked Milk as consumed",
  );
  assert.equal(
    activityDescription({ ...base, action: "shopping_added" }),
    "added Milk to Shopping",
  );
});

test("relative activity time handles recent events", () => {
  const now = Date.parse("2026-10-04T16:00:00Z");
  assert.equal(relativeActivityTime("2026-10-04T15:59:40Z", now), "Just now");
  assert.equal(relativeActivityTime("2026-10-04T15:45:00Z", now), "15m");
  assert.equal(relativeActivityTime("2026-10-04T13:00:00Z", now), "3h");
  assert.equal(relativeActivityTime("2026-10-02T16:00:00Z", now), "2d");
});
