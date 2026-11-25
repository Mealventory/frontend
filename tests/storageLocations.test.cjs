const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function compile(path, mocks = {}) {
  const mod = new Module(path);
  mod.require = (name) => {
    if (name in mocks) return mocks[name];
    throw new Error(`Unexpected require: ${name}`);
  };
  mod._compile(
    ts.transpileModule(fs.readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    path
  );
  return mod.exports;
}

const storageLocations = compile('src/lib/storageLocations.ts');

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

test('QR payload versioning builds valid opaque payloads and rejects unsupported versions', () => {
  const payload = storageLocations.buildStorageLocationQrPayload('home-1', 'loc-99');
  assert.equal(payload, 'mealventory://storage-location?v=1&h=home-1&l=loc-99');
  assert.equal(storageLocations.isStorageLocationQrPayload(payload), true);

  // Invite QR and product barcodes must not be misclassified.
  assert.equal(
    storageLocations.isStorageLocationQrPayload('mealventory://join-household?code=ABC123'),
    false
  );
  assert.equal(storageLocations.isStorageLocationQrPayload('0123456789012'), false);

  const parsed = storageLocations.parseStorageLocationQrPayload(payload);
  assert.deepEqual(parsed, {
    ok: true,
    version: 1,
    householdId: 'home-1',
    locationId: 'loc-99',
  });

  const unsupported = storageLocations.parseStorageLocationQrPayload(
    'mealventory://storage-location?v=2&h=home-1&l=loc-99'
  );
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.reason, 'unsupported_version');

  const malformed = storageLocations.parseStorageLocationQrPayload(
    'mealventory://storage-location?v=1&h=home-1'
  );
  assert.equal(malformed.ok, false);
  assert.equal(malformed.reason, 'invalid_payload');
});

test('cross-household and unauthenticated QR scans fail without leaking inventory', () => {
  let store = storageLocations.emptyStorageLocationStore();
  const created = storageLocations.createSubLocation(store, {
    id: 'loc-drawer',
    householdId: 'home-1',
    zone: 'fridge',
    name: 'Bottom Drawer',
    instructions: 'Crisper veggies',
  });
  store = created.store;
  const qr = storageLocations.buildStorageLocationQrPayload('home-1', 'loc-drawer');

  const unauth = storageLocations.resolveScannedStorageLocation({
    rawPayload: qr,
    authenticated: false,
    activeHouseholdId: 'home-1',
    locations: store.locations,
  });
  assert.equal(unauth.ok, false);
  assert.equal(unauth.reason, 'unauthenticated');

  const wrongHome = storageLocations.resolveScannedStorageLocation({
    rawPayload: qr,
    authenticated: true,
    activeHouseholdId: 'home-2',
    locations: store.locations,
  });
  assert.equal(wrongHome.ok, false);
  assert.equal(wrongHome.reason, 'wrong_household');
  assert.equal('location' in wrongHome, false);
  assert.doesNotMatch(wrongHome.message, /Bottom Drawer/);

  const valid = storageLocations.resolveScannedStorageLocation({
    rawPayload: qr,
    authenticated: true,
    activeHouseholdId: 'home-1',
    locations: store.locations,
  });
  assert.equal(valid.ok, true);
  assert.equal(valid.location.name, 'Bottom Drawer');
});

test('renaming, moving items, safe deletion, and missing location scans preserve inventory', () => {
  let store = storageLocations.emptyStorageLocationStore();
  const binA = storageLocations.createSubLocation(store, {
    id: 'loc-a',
    householdId: 'home-1',
    zone: 'pantry',
    name: 'Cereal Shelf',
    instructions: 'Top left shelf',
  });
  store = binA.store;
  const binB = storageLocations.createSubLocation(store, {
    id: 'loc-b',
    householdId: 'home-1',
    zone: 'pantry',
    name: 'Snack Bin',
  });
  store = binB.store;

  store = storageLocations.assignItemToSubLocation(store, 'item-1', 'loc-a');
  store = storageLocations.assignItemToSubLocation(store, 'item-2', 'loc-a');
  store = storageLocations.renameSubLocation(store, 'loc-a', { name: 'Breakfast Shelf' });

  const inventory = [
    { id: 'item-1', name: 'Oats' },
    { id: 'item-2', name: 'Granola' },
    { id: 'item-3', name: 'Rice' },
  ];
  assert.deepEqual(
    storageLocations.filterItemsBySubLocation(inventory, store, 'loc-a').map((i) => i.id),
    ['item-1', 'item-2']
  );

  // Move one item out (unassign) and delete location while reassigning remaining item
  store = storageLocations.assignItemToSubLocation(store, 'item-2', null);
  const deleted = storageLocations.deleteSubLocationSafely(store, 'loc-a', 'loc-b');
  store = deleted.store;
  assert.deepEqual(deleted.movedItemIds, ['item-1']);
  assert.deepEqual(
    storageLocations.filterItemsBySubLocation(inventory, store, 'loc-b').map((i) => i.id),
    ['item-1']
  );

  // Scanning the deleted location returns not_found
  const missingScan = storageLocations.resolveScannedStorageLocation({
    rawPayload: storageLocations.buildStorageLocationQrPayload('home-1', 'loc-a'),
    authenticated: true,
    activeHouseholdId: 'home-1',
    locations: store.locations,
  });
  assert.equal(missingScan.ok, false);
  assert.equal(missingScan.reason, 'not_found');

  // Share text includes name, zone, instructions, and deep link
  const shareText = storageLocations.storageLocationShareText(
    { ...binA.location, name: 'Breakfast Shelf' },
    'Ordonez Kitchen'
  );
  assert.match(shareText, /Breakfast Shelf/);
  assert.match(shareText, /Pantry/);
  assert.match(shareText, /Top left shelf/);
  assert.match(shareText, /mealventory:\/\/storage-location\?v=1&h=home-1&l=loc-a/);

  // Storage round-trip filters out orphaned assignments
  const mem = createMemoryStorage();
  storageLocations.saveStorageLocationStore('home-1', store, mem);
  const reloaded = storageLocations.loadStorageLocationStore('home-1', mem);
  assert.deepEqual(reloaded.assignments, { 'item-1': 'loc-b' });
});

test('scanner capture routes storage-location QR without altering invite QR or barcodes', () => {
  const source = fs.readFileSync('src/hooks/useScannerCapture.ts', 'utf8');
  assert.match(source, /mealventory:\/\/storage-location/);
  assert.match(source, /\/\(app\)\/household\/storage-location/);
});
