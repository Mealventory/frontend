const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const mod = new Module('button');
mod.require = name => {
  if (name === 'react') return {};
  if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  if (name === 'react-native') return { Pressable: 'Pressable', Text: 'Text', View: 'View', ActivityIndicator: 'Spinner' };
  throw new Error(name);
};
mod._compile(ts.transpileModule(fs.readFileSync('src/components/atoms/Button.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, 'button.cjs');
test('button renders without navigation and preserves press and loading behavior', () => {
  let presses = 0;
  const button = mod.exports.Button({ label: 'Confirm', onPress: () => presses++ });
  assert.equal(button.type, 'Pressable');
  button.props.onPress(); assert.equal(presses, 1);
  assert.equal(button.props.style({ pressed: true })[1].opacity, .8);
  for (const state of [{ loading: true }, { disabled: true }]) {
    const busy = mod.exports.Button({ label: 'Confirm', ...state });
    assert.equal(busy.props.disabled, true);
    assert.equal(busy.props.accessibilityState.disabled, true);
    assert.equal(busy.props.style({ pressed: false })[1].opacity, .5);
  }
});

test('selection changes use native shadows without dynamically adding shadow classes', () => {
  for (const variant of ['secondary', 'primary', 'secondary', 'ghost', 'danger', 'social']) {
    const button = mod.exports.Button({ label: 'Mandarin', variant });
    assert.equal(/shadow-/.test(button.props.className), false);
    const style = button.props.style({ pressed: false });
    assert.equal(style[2].elevation, ['primary', 'danger', 'social'].includes(variant) ? 1 : 0);
  }
});

test('singleLine buttons render an unwrapped label without changing other buttons', () => {
  const single = mod.exports.Button({ label: 'Cancel', singleLine: true });
  const defaultButton = mod.exports.Button({ label: 'Add ingredients to shopping' });
  function findText(node) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'Text') return node;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      const result = findText(child);
      if (result) return result;
    }
    return null;
  }
  assert.equal(findText(single)?.props.numberOfLines, 1);
  assert.equal(findText(defaultButton)?.props.numberOfLines, undefined);
});

test('all compact top-left Cancel actions reserve enough width for one line', () => {
  const manual = fs.readFileSync('app/(modal)/manual-add.tsx', 'utf8');
  const edit = fs.readFileSync('app/(app)/inventory/edit.tsx', 'utf8');
  const review = fs.readFileSync('src/components/organisms/ReceiptReviewSheet.tsx', 'utf8');
  for (const [screen, content] of [
    ['Manual Entry', manual], ['Edit Item', edit], ['Scan Review', review],
  ]) {
    const button = content.match(/<Button\\b[^>]*label="Cancel"[^>]*\\/>/s);
    assert.ok(button, screen + ' should have a Cancel button');
    assert.match(button[0], /singleLine/);
    assert.match(button[0], /w-24 shrink-0 px-2/);
  }
});
