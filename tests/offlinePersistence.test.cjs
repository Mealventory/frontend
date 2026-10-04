const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("offline cache dependencies and lockfile stay in sync", () => {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
  const expected = {
    "@tanstack/query-async-storage-persister": "^5.102.8",
    "@tanstack/react-query": "^5.102.8",
    "@tanstack/react-query-persist-client": "^5.102.8",
    "react-native-mmkv": "^4.3.2",
    "react-native-nitro-modules": "^0.37.1",
  };

  for (const [name, version] of Object.entries(expected)) {
    assert.equal(pkg.dependencies[name], version, `${name} should be declared`);
    assert.equal(lock.packages[""].dependencies[name], version, `${name} should be locked at the root`);
    assert.ok(lock.packages[`node_modules/${name}`], `${name} should have a lockfile package entry`);
  }
});

test("MMKV storage uses the v4 API with a stable cache id", () => {
  const storage = fs.readFileSync("src/lib/storage.ts", "utf8");

  assert.ok(storage.includes("createMMKV"));
  assert.ok(storage.includes("mealventory-sync-cache"));
  assert.ok(storage.includes("getString"));
  assert.ok(storage.includes(".remove("));
  assert.ok(storage.includes("Constants.appOwnership === 'expo'"));
  assert.ok(storage.includes("memoryStorage"));
  assert.ok(!storage.includes("new MMKV"));
});

test("query persistence keeps inventory for seven days only", () => {
  const source = fs.readFileSync("src/lib/queryClient.ts", "utf8");

  assert.match(source, /QUERY_CACHE_MAX_AGE\s*=\s*1000 \* 60 \* 60 \* 24 \* 7/);
  assert.ok(source.includes("gcTime: QUERY_CACHE_MAX_AGE"));
  assert.ok(source.includes("createAsyncStoragePersister"));
  assert.ok(source.includes("INVENTORY_QUERY_ROOT"));
  assert.ok(source.includes("query.queryKey[0] === INVENTORY_QUERY_ROOT"));
  assert.ok(source.includes("query.state.data !== undefined"));
  assert.ok(!source.includes("query.state.status === 'success'"));
});

test("persisted provider restores before the app providers mount", () => {
  const root = fs.readFileSync("app/_layout.tsx", "utf8");

  assert.ok(root.includes("PersistQueryClientProvider"));
  assert.ok(root.includes("useIsRestoring"));
  assert.ok(root.includes("if (isRestoring)"));
  assert.ok(root.includes("maxAge: QUERY_CACHE_MAX_AGE"));
  assert.ok(root.includes("shouldDehydrateQuery: shouldPersistQuery"));
});

test("inventory cache is scoped by user and household and survives refresh errors", () => {
  const context = fs.readFileSync("src/context/InventoryContext.tsx", "utf8");
  const query = fs.readFileSync("src/lib/queryClient.ts", "utf8");

  assert.ok(query.includes("userId || 'signed-out'"));
  assert.ok(query.includes("householdId || 'no-household'"));
  assert.ok(context.includes("inventoryQueryKey(session?.user.id, household?.id)"));
  assert.ok(context.includes("queryClient.setQueryData<FoodItem[]>"));
  assert.ok(context.includes("inventory.length === 0 && inventoryQuery.error"));
  assert.ok(context.includes("previous !== current"));
  assert.ok(context.includes("queryClient.removeQueries"));
});

test("Expo native prebuild folders remain generated local artifacts", () => {
  const ignore = fs.readFileSync(".gitignore", "utf8");
  assert.match(ignore, /^ios\/$/m);
  assert.match(ignore, /^android\/$/m);
});
