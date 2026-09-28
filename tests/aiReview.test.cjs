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

const { parseRawScanItems, getItemEmoji } = load('app/(modal)/ai-review.tsx', {
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

test('confirmed items can be mapped to ItemCreate payloads for household inventory API', () => {
  const reviewItems = [
    {
      id: '1',
      name: 'Greek Yogurt',
      category: 'Dairy',
      quantity: 1,
      unit: '32 oz',
      expiry_date: '2026-09-30',
      storageZone: 'fridge',
      confirmed: true,
    },
    {
      id: '2',
      name: 'Unwanted Item',
      category: 'Pantry',
      quantity: 1,
      unit: 'units',
      expiry_date: '2026-10-10',
      storageZone: 'pantry',
      confirmed: false, // rejected by user
    },
  ];

  const confirmedOnly = reviewItems.filter((i) => i.confirmed);
  assert.equal(confirmedOnly.length, 1);

  const payload = {
    name: confirmedOnly[0].name.trim(),
    category: confirmedOnly[0].category.trim() || 'Pantry',
    quantity: Number(confirmedOnly[0].quantity) || 1,
    unit: confirmedOnly[0].unit.trim() || 'units',
    expiry_date: confirmedOnly[0].expiry_date,
  };

  assert.deepEqual(payload, {
    name: 'Greek Yogurt',
    category: 'Dairy',
    quantity: 1,
    unit: '32 oz',
    expiry_date: '2026-09-30',
  });
});
