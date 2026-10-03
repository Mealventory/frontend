const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

function loadModule() {
  const file = "src/lib/scanHistory.ts";
  const store = new Map();
  const authStorageAdapter = {
    async getItem(key) { return store.get(key) ?? null; },
    async setItem(key, value) { store.set(key, value); },
    async removeItem(key) { store.delete(key); },
  };

  const mod = new Module(file);
  mod.require = (name) => {
    if (name === "./authStorage") return { authStorageAdapter };
    throw new Error(name);
  };
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    file,
  );
  return { api: mod.exports, store };
}

const HOME = { userId: "user-1", householdId: "home-1" };
const OTHER = { userId: "user-1", householdId: "home-2" };
const apple = {
  name: "Apple",
  category: "Produce",
  quantity: 1,
  unit: "units",
  expiry_date: null,
  storageZone: "fridge",
};

test("scan history stores newest-first and remains household scoped", async () => {
  const { api } = loadModule();
  await api.recordScanSuccess(HOME, "food", [apple]);
  await api.recordScanFailure(HOME, "receipt", "Receipt could not be detected.");
  await api.recordScanSuccess(OTHER, "barcode", [{ ...apple, name: "Milk" }], "012345");

  const home = await api.loadScanHistory(HOME);
  const other = await api.loadScanHistory(OTHER);

  assert.equal(home.length, 2);
  assert.equal(home[0].status, "failed");
  assert.equal(home[0].mode, "receipt");
  assert.equal(home[0].error, "Receipt could not be detected.");
  assert.equal(home[1].items[0].name, "Apple");

  assert.equal(other.length, 1);
  assert.equal(other[0].mode, "barcode");
  assert.equal(other[0].barcode, "012345");
});

test("scan history caps retained entries and summarizes item names", async () => {
  const { api } = loadModule();
  for (let i = 0; i < 45; i++) {
    await api.recordScanSuccess(HOME, "food", [{ ...apple, name: `Food ${i}` }]);
  }
  const history = await api.loadScanHistory(HOME);
  assert.equal(history.length, 40);
  assert.equal(api.summarizeScanItems([
    apple,
    { ...apple, name: "Milk" },
    { ...apple, name: "Bread" },
    { ...apple, name: "Eggs" },
  ]), "Apple, Milk, Bread +1 more");
});
