const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function harness(initialState = 'active') {
  let focused = true, foreground, listener, cleanup, removed = false, subscribed = false;
  const mod = new Module('scannerActive');
  mod.require = name => {
    if (name === 'react') return {
      useState: value => {
        if (foreground === undefined) foreground = value;
        return [foreground, value => { foreground = value; }];
      },
      useEffect: effect => { if (!subscribed) { subscribed = true; cleanup = effect(); } },
    };
    if (name === 'expo-router') return { useIsFocused: () => focused };
    if (name === 'react-native') return { AppState: {
      currentState: initialState,
      addEventListener: (_, fn) => { listener = fn; return { remove: () => { removed = true; } }; },
    } };
    throw new Error(name);
  };
  mod._compile(ts.transpileModule(fs.readFileSync('src/hooks/useScannerActive.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, 'scannerActive.cjs');
  return {
    render: () => mod.exports.useScannerActive(),
    focus: value => { focused = value; },
    appState: value => listener(value),
    unmount: () => cleanup(),
    removed: () => removed,
  };
}

test('review navigation releases camera and returning remounts it repeatedly', () => {
  const h = harness();
  assert.equal(h.render(), true);
  for (let i = 0; i < 3; i++) {
    h.focus(false); assert.equal(h.render(), false);
    h.focus(true); assert.equal(h.render(), true);
  }
  h.unmount();
  assert.equal(h.removed(), true);
});

test('backgrounding releases camera and resume never activates an unfocused scanner', () => {
  const h = harness();
  assert.equal(h.render(), true);
  h.appState('inactive'); assert.equal(h.render(), false);
  h.appState('background'); assert.equal(h.render(), false);
  h.focus(false);
  h.appState('active'); assert.equal(h.render(), false);
  h.focus(true); assert.equal(h.render(), true);
  h.unmount();
});

test('scanner opened while app is inactive waits for foreground', () => {
  const h = harness('inactive');
  assert.equal(h.render(), false);
  h.appState('active');
  assert.equal(h.render(), true);
  h.unmount();
});
