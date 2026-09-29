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
