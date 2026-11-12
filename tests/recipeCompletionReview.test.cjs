const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
function compile(path, mocks = {}) {
  const mod = new Module(path);
  mod.require = name => { if (name in mocks) return mocks[name]; throw Error(name); };
  mod._compile(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, path);
  return mod.exports;
}
const lib = compile('src/lib/recipeCompletion.ts');
const expiryDate = compile('src/lib/expiryDate.ts');
const tick = () => new Promise(resolve => setImmediate(resolve));
function walk(node) {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!node || typeof node !== 'object') return [];
  return [node, ...walk(node.props?.children)];
}
function harness(storage, submit, failStorage = false, batchCreate = async () => []) {
  let cursor = 0; const slots = []; const effects = [];
  const react = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(value) { const i = cursor++; if (!(i in slots)) slots[i] = { current: value }; return slots[i]; },
    useEffect(fn) { const i = cursor++; if (!(i in slots)) { slots[i] = true; effects.push(fn); } },
  };
  let refreshed = 0; let cleared = 0;
  const Review = compile('src/components/domain/RecipeCompletionReview.tsx', {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { ActivityIndicator: 'Spinner', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' }, '../atoms/Button': { Button: 'Button' },
    '../atoms/Checkbox': { Checkbox: 'Checkbox' }, '../molecules/FormField': { FormField: 'FormField' },
    '../molecules/TagChipGroup': { TagChipGroup: 'TagChipGroup' }, '../molecules/ExpiryDateField': { ExpiryDateField: 'ExpiryDateField' },
    '../../lib/inventoryApi': { inventoryRequest: async () => [{ id: 'rice', name: 'Rice', quantity: '5', unit: 'cups' }], batchCreateInventoryItems: batchCreate },
    '../../lib/supabase': { supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'token', user: { id: 'user' } } } }) } } },
    '../../lib/recipeCompletion': { ...lib, submitCompletion: submit },
    '../../lib/recipeCompletionStorage': {
      readCompletion: async key => storage.get(key) || null,
      writeCompletion: async (key, record) => { if (failStorage) throw Error('Storage unavailable'); storage.set(key, record); },
    },
    '../../lib/cookingSession': { clearCookingSession: () => cleared++ },
    '../../lib/expiryDate': expiryDate,
  }).RecipeCompletionReview;
  function render() {
    cursor = 0;
    const tree = Review({ recipe: { id: 'recipe', name: 'Rice bowl', uses: ['Rice'] }, householdId: 'home', userId: 'user', onBack() {}, onDone() {}, refreshInventory: async () => { refreshed++; } });
    while (effects.length) effects.shift()();
    return walk(tree);
  }
  return { render, get refreshed() { return refreshed; }, get cleared() { return cleared; } };
}
test('review requires amounts and keeps a durable submission across interruption, double taps, and reopening', async () => {
  const storage = new Map(); const calls = [];
  let resolve;
  const submit = async (_token, home, request) => {
    calls.push({ home, request });
    if (calls.length === 1) throw new lib.CompletionError('Connection interrupted');
    return new Promise(done => { resolve = () => done({ completion_id: request.completion_id, items: [] }); });
  };
  let h = harness(storage, submit);
  h.render(); await tick();
  let nodes = h.render();
  assert.equal(nodes.find(n => n.props?.label === 'Confirm amounts & update pantry').props.disabled, true);
  nodes.find(n => n.type === 'TextInput').props.onChangeText('2');
  h.render().find(n => n.props?.label === 'Confirm amounts & update pantry').props.onPress();
  await tick();
  assert.equal(h.cleared, 0);
  assert.ok(storage.get('user:home:recipe'));
  h = harness(storage, submit);
  h.render(); await tick();
  const retry = h.render().find(n => n.props?.label === 'Retry pantry update');
  retry.props.onPress(); retry.props.onPress(); await tick();
  assert.equal(calls.length, 2);
  assert.equal(calls[0].request.completion_id, calls[1].request.completion_id);
  assert.equal(calls[1].home, 'home');
  resolve(); await tick();
  assert.equal(h.refreshed, 1); assert.equal(h.cleared, 1);
  assert.ok(h.render().find(n => n.props?.label === 'Done'));
});
test('storage failure prevents an unprotected inventory mutation', async () => {
  let calls = 0;
  const h = harness(new Map(), async () => { calls++; }, true);
  h.render(); await tick();
  h.render().find(n => n.type === 'TextInput').props.onChangeText('2');
  h.render().find(n => n.props?.label === 'Confirm amounts & update pantry').props.onPress();
  await tick();
  assert.equal(calls, 0); assert.equal(h.cleared, 0);
});

test('skipping pantry deductions finishes the meal and leftover retry reuses its exact idempotent request', async () => {
  const storage = new Map(); const calls = []; let attempt = 0;
  let h = harness(storage, async () => { throw Error('ingredient completion must not be called'); }, false,
    async (_token, home, items, key) => {
      calls.push({ home, items, key });
      attempt++;
      if (attempt === 1) throw Error('Connection interrupted after request');
      return [{ id: 'leftover-1' }];
    });

  h.render(); await tick();
  h.render().find(node => node.props?.label === 'Finish without changing pantry').props.onPress();
  await tick();
  assert.ok(h.render().some(node => node.props?.children === 'Meal finished. Your pantry was left unchanged.'));

  h.render().find(node => node.props?.label === 'Save Leftovers').props.onPress();
  let nodes = h.render();
  nodes.find(node => node.type === 'Checkbox').props.onToggle(true);
  nodes = h.render();
  nodes.find(node => node.props?.label === 'Save Leftovers' && node.props?.disabled === false).props.onPress();
  await tick();
  nodes = h.render();
  assert.ok(nodes.some(node => node.props?.label === 'Retry Save Leftovers'));
  h = harness(storage, async () => { throw Error('ingredient completion must not be called'); }, false,
    async (_token, home, items, key) => {
      calls.push({ home, items, key });
      attempt++;
      return [{ id: 'leftover-1' }];
    });
  h.render(); await tick();
  nodes = h.render();
  assert.ok(nodes.some(node => node.props?.label === 'Retry Save Leftovers'));
  nodes.find(node => node.props?.label === 'Retry Save Leftovers').props.onPress();
  await tick();

  assert.equal(calls.length, 2);
  assert.equal(calls[0].home, 'home');
  assert.equal(calls[0].key, `leftover-${storage.get('user:home:recipe').request.completion_id}`);
  assert.match(calls[0].key, /^leftover-meal-/);
  assert.deepEqual(calls[0].items, calls[1].items);
  assert.equal(calls[0].items[0].name, 'Rice bowl');
  assert.equal(calls[0].items[0].quantity, 1);
  assert.equal(calls[0].items[0].unit, 'portions');
  assert.equal(calls[0].items[0].storage_zone, 'fridge');
  assert.equal(calls[0].items[0].expiry_date, null);
  assert.equal(storage.get('user:home:recipe').leftover.status, 'saved');
  assert.equal(h.refreshed, 1);
});

test('confirmed date is stored with leftover and ingredient consumption retains its own completion ID', async () => {
  const storage = new Map(); const calls = [];
  const h = harness(storage, async (_token, home, request) => ({ completion_id: request.completion_id, items: [] }), false,
    async (_token, _home, items, key) => { calls.push({ items, key }); return []; });
  h.render(); await tick();
  let nodes = h.render();
  nodes.find(node => node.props?.label === 'Servings prepared').props.onChangeText('3');
  nodes = h.render();
  nodes.find(node => node.type === 'TextInput').props.onChangeText('2');
  h.render().find(node => node.props?.label === 'Confirm amounts & update pantry').props.onPress();
  await tick();
  nodes = h.render();
  nodes.find(node => node.props?.label === 'Save Leftovers').props.onPress();
  nodes = h.render();
  assert.equal(nodes.find(node => node.props?.label === 'Portions to save').props.value, '3');
  nodes.find(node => node.props?.label === 'Portions to save').props.onChangeText('2');
  nodes = h.render();
  nodes.find(node => node.type === 'ExpiryDateField').props.onChangeText('2027-04-05');
  nodes = h.render();
  nodes.find(node => node.type === 'Checkbox').props.onToggle(true);
  nodes = h.render();
  nodes.find(node => node.props?.label === 'Save Leftovers' && node.props?.disabled === false).props.onPress();
  await tick();

  assert.equal(calls.length, 1);
  const savedRecord = storage.get('user:home:recipe');
  assert.equal(calls[0].key, `leftover-${savedRecord.request.completion_id}`);
  assert.notEqual(calls[0].key, savedRecord.request.completion_id);
  assert.equal(calls[0].items[0].expiry_date, '2027-04-05');
  assert.equal(calls[0].items[0].quantity, 2);
  assert.equal(savedRecord.result.completion_id, savedRecord.request.completion_id);
  assert.equal(savedRecord.servings_made, 3);
  assert.equal(savedRecord.leftover.status, 'saved');
});

test('unknown dates require confirmation and malformed dates never reach inventory', async () => {
  const storage = new Map(); let mutations = 0;
  const h = harness(storage, async () => { throw Error('not used'); }, false, async () => { mutations++; return []; });
  h.render(); await tick();
  h.render().find(node => node.props?.label === 'Finish without changing pantry').props.onPress();
  await tick();
  h.render().find(node => node.props?.label === 'Save Leftovers').props.onPress();
  let nodes = h.render();
  const saveButton = () => h.render().find(node => node.props?.label === 'Save Leftovers' && node.props?.disabled !== undefined);
  assert.equal(saveButton().props.disabled, true);
  nodes.find(node => node.type === 'Checkbox').props.onToggle(true);
  nodes = h.render();
  nodes.find(node => node.type === 'ExpiryDateField').props.onChangeText('2027-02-30');
  nodes = h.render();
  nodes.find(node => node.type === 'Checkbox').props.onToggle(true);
  nodes = h.render();
  nodes.find(node => node.props?.label === 'Save Leftovers' && node.props?.disabled === false).props.onPress();
  await tick();
  assert.equal(mutations, 0);
  assert.ok(h.render().some(node => typeof node.props?.children === 'string' && node.props.children.includes('date does not exist')));
});
