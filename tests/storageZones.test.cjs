const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function compile(path, mocks = {}) {
  const mod = new Module(path);
  mod.require = (name) => {
    if (name in mocks) return mocks[name];
    throw Error(name);
  };
  mod._compile(
    ts.transpileModule(fs.readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    path
  );
  return mod.exports;
}

const dates = compile('src/lib/pantryExpiry.ts');

function harness() {
  const pushes = [];
  const react = { useMemo: (fn) => fn() };
  const data = {
    inventory: [
      { id: '1', name: 'Milk', category: 'Dairy', expiryDate: dates.localDay(), storageZone: 'fridge' },
      { id: '2', name: 'Spinach', category: 'Produce', expiryDate: dates.localDay(), storageZone: 'fridge' },
      { id: '3', name: 'Pasta', category: 'Pantry', expiryDate: null, storageZone: 'pantry' },
    ],
    inventoryLoading: false,
    inventoryError: '',
    refreshInventory: async () => {},
  };
  const native = { View: 'View', TouchableOpacity: 'TouchableOpacity', ActivityIndicator: 'ActivityIndicator' };
  const mocks = {
    react,
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    'react-native': native,
    'expo-router': { useRouter: () => ({ push: (value) => pushes.push(value) }) },
    '@/src/components/layout/RoutePlaceholder': { RoutePlaceholder: 'RoutePlaceholder' },
    '@/src/components/atoms': { Badge: 'Badge', Button: 'Button', Typography: 'Typography' },
    '@/src/components/atoms/Icon': { Icon: 'Icon' },
    '@/src/context/InventoryContext': { useInventory: () => data },
    '@/src/lib/pantryExpiry': dates,
  };
  const Screen = compile('app/(app)/household/storage-zones.tsx', mocks).default;
  const walk = (node) =>
    Array.isArray(node)
      ? node.flatMap(walk)
      : !node || typeof node !== 'object'
        ? []
        : [node, ...walk(node.props?.children), ...walk(node.props?.leadingIcon)];

  return { nodes: () => walk(Screen()), pushes, data };
}

test('storage zone dashboard shows live counts and expiry attention', () => {
  const h = harness();
  const nodes = h.nodes();

  assert.ok(nodes.find((node) => node.props?.accessibilityLabel === 'Open Refrigerator, 2 items, 2 expiring soon'));
  assert.ok(nodes.find((node) => node.props?.accessibilityLabel === 'Open Pantry, 1 item, 0 expiring soon'));
  assert.ok(nodes.find((node) => node.props?.accessibilityLabel === 'Open Freezer, 0 items, 0 expiring soon'));
  assert.ok(nodes.find((node) => node.props?.label === 'Add item to Freezer'));
  assert.ok(nodes.find((node) => node.type === 'Typography' && node.props?.children === 'Milk'));
});

test('zone cards open the pantry filter and empty zones can add an item', () => {
  const h = harness();
  const nodes = h.nodes();

  nodes.find((node) => node.props?.accessibilityLabel?.startsWith('Open Refrigerator')).props.onPress();
  assert.deepEqual(h.pushes[0], {
    pathname: '/(app)/(tabs)',
    params: { zone: 'fridge' },
  });

  nodes.find((node) => node.props?.label === 'Add item to Freezer').props.onPress();
  assert.equal(h.pushes[1], '/(modal)/manual-add');
});
