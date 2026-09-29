const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function load(file, mocks = {}) {
  const mod = new Module(file, module);
  mod.paths = module.paths;
  const original = mod.require.bind(mod);
  mod.require = name => (name in mocks ? mocks[name] : original(name));
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    file
  );
  return mod.exports;
}

const mockComponent = () => null;

const { parseRawScanItems, getItemEmoji, saveReviewedItems } = load('app/(modal)/ai-review.tsx', {
  '@/src/components/molecules/ExpiryDateField': { ExpiryDateField: mockComponent },
  '@/src/lib/expiryDate': load('src/lib/expiryDate.ts'),
  '@/src/lib/storageZones': load('src/lib/storageZones.ts'),
  'react-native': {
    View: mockComponent,
    ScrollView: mockComponent,
    TouchableOpacity: mockComponent,
    TextInput: mockComponent,
    ActivityIndicator: mockComponent,
    Text: mockComponent,
    Alert: { alert: () => {} },
  },
  'react-native-safe-area-context': { SafeAreaView: mockComponent },
  'expo-router': { useRouter: () => ({ back: () => {}, replace: () => {} }), useLocalSearchParams: () => ({}) },
  '@/src/components/atoms': {
    Typography: mockComponent,
    Button: mockComponent,
    Icon: mockComponent,
    Badge: mockComponent,
    Avatar: mockComponent,
    Checkbox: mockComponent,
  },
  '@/src/components/molecules/EmptyState': { EmptyState: mockComponent },
  '@/src/components/molecules': { FormField: mockComponent },
  '@/src/context/AuthContext': { useAuth: () => ({ session: null, household: null }) },
  '@/src/context/InventoryContext': { useInventory: () => ({ refreshInventory: async () => {} }) },
  '@/src/lib/supabase': { supabase: null },
  '@/src/lib/inventoryApi': { inventoryRequest: async () => ({}) },
});

test('parseRawScanItems parses JSON array of scan results into review states', () => {
  const rawItems = JSON.stringify([
    {
      name: 'Organic Milk',
      category: 'Dairy',
      quantity: 2,
      unit: 'gallons',
      expiry_date: '2026-09-25',
      confidence: 0.95,
      storageZone: 'fridge',
    },
    {
      name: 'Honeycrisp Apples',
      category: 'Produce',
      quantity: 4,
      unit: 'units',
      expiry_date: null,
      confidence: 0.88,
      storageZone: 'fridge',
    },
  ]);

  const parsed = parseRawScanItems(rawItems);
  assert.equal(parsed.length, 2);

  assert.equal(parsed[0].name, 'Organic Milk');
  assert.equal(parsed[0].category, 'Dairy');
  assert.equal(parsed[0].quantity, 2);
  assert.equal(parsed[0].unit, 'gallons');
  assert.equal(parsed[0].expiry_date, '2026-09-25');
  assert.equal(parsed[0].confidence, 0.95);
  assert.equal(parsed[0].confirmed, true);
  assert.equal(parsed[0].isEditing, false);

  assert.equal(parsed[1].name, 'Honeycrisp Apples');
  assert.equal(parsed[1].confirmed, true);
});

test('parseRawScanItems handles undefined and corrupted input gracefully', () => {
  assert.deepEqual(parseRawScanItems(undefined), []);
  assert.deepEqual(parseRawScanItems(''), []);
  assert.deepEqual(parseRawScanItems('not-valid-json'), []);
  assert.deepEqual(parseRawScanItems('{}'), []);
});

test('getItemEmoji returns appropriate emoji based on item name and category', () => {
  assert.equal(getItemEmoji('Organic Blueberries', 'Produce'), '🫐');
  assert.equal(getItemEmoji('Red Apple', 'Produce'), '🍎');
  assert.equal(getItemEmoji('Bananas', 'Produce'), '🍌');
  assert.equal(getItemEmoji('Chicken Breast', 'Meat'), '🍗');
  assert.equal(getItemEmoji('Whole Milk', 'Dairy'), '🥛');
  assert.equal(getItemEmoji('Sharp Cheddar', 'Dairy'), '🧀');
  assert.equal(getItemEmoji('Sourdough Bread', 'Bakery'), '🍞');
  assert.equal(getItemEmoji('Core Power Protein Shake', 'Beverage'), '🥤');
  assert.equal(getItemEmoji('Unknown Mystery Item', 'Pantry'), '🍽️');
});

test('empty or missing scans never create review items', () => {
  for (const value of [undefined, '', '[]', '{}', 'invalid']) {
    assert.deepEqual(parseRawScanItems(value), []);
  }
});

test('unknown dates remain blank and category defaults preserve explicit zones', () => {
  const items = parseRawScanItems(JSON.stringify([
    { name: 'Milk', category: 'Dairy', expiry_date: null },
    { name: 'Peas', category: 'Frozen' },
    { name: 'Milk', category: 'Dairy', storageZone: 'freezer' },
    { name: 'Spice', category: 'Spices', storageZone: 'invalid' },
  ]));
  assert.deepEqual(items.map(item => item.expiry_date), ['', '', '', '']);
  assert.deepEqual(items.map(item => item.storageZone), ['fridge', 'freezer', 'freezer', 'spicerack']);
});

test('partial saves retain failures for retry without resending acknowledged items', async () => {
  const items = parseRawScanItems(JSON.stringify([
    { id: '1', name: 'Milk', category: 'Dairy' },
    { id: '2', name: 'Peas', category: 'Frozen' },
    { id: '3', name: 'Skip', category: 'Pantry' },
  ]));
  items[2].confirmed = false;
  const payloads = [];
  const result = await saveReviewedItems(items, async payload => {
    payloads.push(payload);
    if (payload.name === 'Peas') throw new Error('Offline');
  });
  assert.deepEqual(result.savedIds, ['1']);
  assert.deepEqual(result.errors, ['Peas: Offline']);
  assert.equal(payloads[0].expiry_date, null);
  assert.equal(payloads[0].storage_zone, 'fridge');
  const remaining = items.filter(item => !result.savedIds.includes(item.id));
  const retried = [];
  const retry = await saveReviewedItems(remaining, async payload => { retried.push(payload.name); });
  assert.deepEqual(retried, ['Peas']);
  assert.deepEqual(retry.savedIds, ['2']);
  assert.deepEqual(retry.errors, []);
});

test('all failed saves keep every item retryable', async () => {
  const items = parseRawScanItems(JSON.stringify([{ id: '1', name: 'Rice' }]));
  const result = await saveReviewedItems(items, async () => { throw new Error('Unavailable'); });
  assert.deepEqual(result.savedIds, []);
  assert.equal(result.errors.length, 1);
});

test('parseRawScanItems handles rawBarcode parameter when items JSON is absent or empty', () => {
  const itemsFromBarcode = parseRawScanItems(undefined, '012345678905');
  assert.equal(itemsFromBarcode.length, 1);
  assert.equal(itemsFromBarcode[0].name, 'Barcode: 012345678905');
  assert.equal(itemsFromBarcode[0].category, 'Pantry');
  assert.equal(itemsFromBarcode[0].storageZone, 'pantry');
  assert.equal(itemsFromBarcode[0].quantity, 1);
  assert.equal(itemsFromBarcode[0].confirmed, true);
});

test('weak recognition suggestions require confirmation before saving', async () => {
  const items = parseRawScanItems(JSON.stringify([{ name: 'ginger', confidence: 0.553 }]));
  assert.equal(items[0].confirmed, false);
  assert.equal(items[0].isEditing, true);
  let calls = 0;
  await saveReviewedItems(items, async () => { calls++; });
  assert.equal(calls, 0);
  items[0].confirmed = true;
  await saveReviewedItems(items, async () => { calls++; });
  assert.equal(calls, 1);
});
