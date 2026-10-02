const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function harness() {
  const slots = []; let cursor = 0; let reads = 0; let resolveRead; let nativeScheme = "light";
  const effects = []; const applied = [];
  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], value => { slots[i] = value; }]; },
    useCallback(fn) { return fn; },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => v !== slots[i][j])) { slots[i] = deps; effects.push(fn); } },
  };
  const mocks = {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'react-native': { Appearance: { getColorScheme: () => 'light', addChangeListener: () => ({ remove() {} }) } },
    nativewind: { useColorScheme: () => ({ colorScheme: nativeScheme, setColorScheme: value => applied.push(value) }) },
    '@/src/lib/themeStorage': { getWebInitialPreference: () => null, themeStorage: {
      getPreference: () => { reads++; return new Promise(resolve => { resolveRead = resolve; }); },
      setPreference: async () => {},
    } },
  };
  const mod = new Module('theme-test');
  mod.require = name => { if (!(name in mocks)) throw Error(name); return mocks[name]; };
  mod._compile(ts.transpileModule(fs.readFileSync('src/context/ThemeContext.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, 'theme-test');
  return {
    render() { cursor = 0; const tree = mod.exports.ThemeProvider({ children: null }); while (effects.length) effects.shift()(); return tree.props.value; },
    appearance(value) { nativeScheme = value; },
    resolve(value) { resolveRead(value); }, get reads() { return reads; }, applied,
  };
}
test('theme changes do not rehydrate old preferences when NativeWind returns a fresh setter', async () => {
  const h = harness(); h.render(); h.resolve('light'); await Promise.resolve();
  let theme = h.render(); await theme.setThemePreference('dark');
  assert.equal(h.render().isDark, false, "inputs must wait for the stylesheet appearance event");
  h.appearance("dark");
  theme = h.render(); assert.equal(theme.isDark, true); assert.equal(h.reads, 1);
  await theme.setThemePreference('light'); h.appearance('light'); assert.equal(h.render().isDark, false);
  assert.deepEqual(h.applied, ['light', 'dark', 'light']);
});
test('a delayed saved preference cannot overwrite a newer user selection', async () => {
  const h = harness(); const theme = h.render(); await theme.setThemePreference('dark');
  h.resolve('light'); await Promise.resolve();
  h.appearance('dark');
  assert.equal(h.render().isDark, true); assert.deepEqual(h.applied, ['dark']);
});

test('system appearance changes update context from the same NativeWind source', async () => {
  const h = harness(); h.render(); h.resolve('system'); await Promise.resolve();
  h.appearance('dark'); assert.equal(h.render().isDark, true);
  h.appearance('light'); assert.equal(h.render().isDark, false);
  assert.equal(h.render().themePreference, 'system');
});
