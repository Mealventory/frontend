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
const tick = () => new Promise(resolve => setImmediate(resolve));
function walk(node) {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!node || typeof node !== 'object') return [];
  return [node, ...walk(node.props?.children)];
}
function harness(storage, submit, failStorage = false) {
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
    '../../lib/inventoryApi': { inventoryRequest: async () => [{ id: 'rice', name: 'Rice', quantity: '5', unit: 'cups' }] },
    '../../lib/supabase': { supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'token', user: { id: 'user' } } } }) } } },
    '../../lib/recipeCompletion': { ...lib, submitCompletion: submit },
    '../../lib/recipeCompletionStorage': {
      readCompletion: async key => storage.get(key) || null,
      writeCompletion: async (key, record) => { if (failStorage) throw Error('Storage unavailable'); storage.set(key, record); },
    },
    '../../lib/cookingSession': { clearCookingSession: () => cleared++ },
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
