const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

function compile(path, mocks = {}) {
  const mod = new Module(path);
  mod.require = (name) => {
    if (name in mocks) return mocks[name];
    throw Error(name);
  };
  mod._compile(
    ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    path
  );
  return mod.exports;
}

const cooking = compile("src/lib/cookingSession.ts");

test("timed cooking steps detect seconds, minutes, and hours", () => {
  assert.equal(cooking.suggestedTimerSeconds("Rest for 30 seconds"), 30);
  assert.equal(cooking.suggestedTimerSeconds("Simmer for 6 minutes per side"), 360);
  assert.equal(cooking.suggestedTimerSeconds("Slow cook for 1.5 hours"), 5400);
  assert.equal(cooking.suggestedTimerSeconds("Season to taste"), null);
});

test("cooking session restores and clamps the current step", () => {
  cooking.clearCookingSession("recipe-session");
  cooking.saveCookingStep("recipe-session", 2, 4);
  assert.equal(cooking.readCookingSession("recipe-session", 4).stepIndex, 2);
  assert.equal(cooking.readCookingSession("recipe-session", 2).stepIndex, 1);
  cooking.clearCookingSession("recipe-session");
  assert.equal(cooking.readCookingSession("recipe-session", 4).stepIndex, 0);
});

test("cooking timers can be started, restored, cancelled, and formatted", () => {
  cooking.clearCookingSession("recipe-timer");
  const timer = cooking.startCookingTimer("recipe-timer", 1, 90, 3, 1000);
  assert.equal(timer.stepIndex, 1);
  assert.equal(cooking.remainingTimerSeconds(timer, 31000), 60);
  assert.equal(cooking.formatCookingTimer(90), "1:30");
  assert.equal(cooking.formatCookingTimer(3661), "1:01:01");
  assert.equal(cooking.readCookingSession("recipe-timer", 3).timer.endsAt, 91000);
  cooking.cancelCookingTimer("recipe-timer", 3);
  assert.equal(cooking.readCookingSession("recipe-timer", 3).timer, null);
});
