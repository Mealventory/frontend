const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

const zones = new Module('storageZones');
zones._compile(
  ts.transpileModule(fs.readFileSync('src/lib/storageZones.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
  'storageZones.cjs'
);

const mod = new Module('barcodeApi');
const originalRequire = mod.require.bind(mod);
mod.require = (name) => {
  if (name === './storageZones') return zones.exports;
  if (name === './scanApi') return { getBackendUrl: () => 'https://mealventory.test' };
  return originalRequire(name);
};
mod._compile(
  ts.transpileModule(fs.readFileSync('src/lib/barcodeApi.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  'barcodeApi.cjs'
);

const { fetchProductByBarcode, normalizeOpenFoodFactsCategory } = mod.exports;

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

test('fetchProductByBarcode resolves product data from the authenticated backend barcode endpoint', async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://mealventory.test/api/v1/barcode/011110038364');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    return new Response(
      JSON.stringify({
        found: true,
        name: 'Chobani Greek Whole Milk Yogurt',
        brand: 'Chobani',
        category: 'Dairy',
        storage_zone: 'fridge',
        image_url: 'https://images.openfoodfacts.org/yogurt.jpg',
        shelf_life_days: 3,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const item = await fetchProductByBarcode('011110038364', 'test-token');
  assert.equal(item.name, 'Chobani Greek Whole Milk Yogurt');
  assert.equal(item.category, 'Dairy');
  assert.equal(item.storageZone, 'fridge');
  assert.equal(item.quantity, 1);
  assert.equal(item.unit, 'units');
  assert.equal(item.confidence, 0.95);
  assert.equal(item.imageRef, 'https://images.openfoodfacts.org/yogurt.jpg');
  assert.equal(item.brand, 'Chobani');
  assert.equal(item.shelfLifeDays, 3);
});

test('fetchProductByBarcode returns fallback item when product is not found', async () => {
  global.fetch = async () => {
    return new Response(
      JSON.stringify({ found: false }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const item = await fetchProductByBarcode('9999999999999', 'test-token');
  assert.equal(item.name, 'Item (9999999999999)');
  assert.equal(item.category, 'Pantry');
  assert.equal(item.storageZone, 'pantry');
  assert.equal(item.quantity, 1);
});

test('fetchProductByBarcode handles network failure gracefully without throwing', async () => {
  global.fetch = async () => {
    throw new Error('Network request failed');
  };

  const item = await fetchProductByBarcode('123456789012', 'test-token');
  assert.equal(item.name, 'Item (123456789012)');
  assert.equal(item.category, 'Pantry');
  assert.equal(item.storageZone, 'pantry');
});

test('fetchProductByBarcode handles empty or blank barcode gracefully', async () => {
  const item = await fetchProductByBarcode('   ');
  assert.equal(item.name, 'Unknown Barcode Item');
  assert.equal(item.storageZone, 'pantry');
});

test('normalizeOpenFoodFactsCategory classifies categories correctly', () => {
  assert.deepEqual(
    normalizeOpenFoodFactsCategory(['en:cheeses', 'en:dairy-products']),
    { category: 'Dairy', storageZone: 'fridge' }
  );
  assert.deepEqual(
    normalizeOpenFoodFactsCategory(['en:poultry', 'en:meats']),
    { category: 'Meat', storageZone: 'fridge' }
  );
  assert.deepEqual(
    normalizeOpenFoodFactsCategory(['en:fresh-vegetables']),
    { category: 'Produce', storageZone: 'fridge' }
  );
  assert.deepEqual(
    normalizeOpenFoodFactsCategory(['en:breads', 'en:bagels']),
    { category: 'Bakery', storageZone: 'pantry' }
  );
  assert.deepEqual(
    normalizeOpenFoodFactsCategory(['en:fruit-juices', 'en:beverages']),
    { category: 'Beverage', storageZone: 'fridge' }
  );
  assert.deepEqual(
    normalizeOpenFoodFactsCategory(['en:frozen-vegetables']),
    { category: 'Frozen', storageZone: 'freezer' }
  );
  assert.deepEqual(
    normalizeOpenFoodFactsCategory(['en:herbs-and-spices']),
    { category: 'Spices', storageZone: 'spicerack' }
  );
  assert.deepEqual(
    normalizeOpenFoodFactsCategory(['en:canned-goods']),
    { category: 'Pantry', storageZone: 'pantry' }
  );
});
