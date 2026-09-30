const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { patchWarning } = require('../scripts/patch-nativewind-warning.cjs');
test('native style upgrade warning does not traverse navigation getters in React children', () => {
  const source = fs.readFileSync(require.resolve('react-native-css-interop/dist/runtime/native/render-component.js'), 'utf8');
  const patched = patchWarning(source);
  const start = patched.indexOf('function printUpgradeWarning(');
  const end = patched.indexOf('\nfunction stringify(', start);
  assert.ok(start >= 0 && end > start);
  let message;
  const context = vm.createContext({ console: { log: value => { message = value; } } });
  vm.runInContext(patched.slice(start, end), context);
  const navigation = { get getKey() { throw new Error('Missing navigation context'); } };
  context.printUpgradeWarning('Style changed', { className: 'shadow-sm', children: { _owner: { navigation } } });
  assert.match(message, /shadow-sm/);
  assert.match(message, /Style changed/);
});
test('patch is idempotent and rejects unknown library layouts', () => {
  const source = 'warning ${stringify(originalProps)}';
  assert.equal(patchWarning(patchWarning(source)), patchWarning(source));
  assert.throws(() => patchWarning('unexpected source'), /no longer matches/);
});
