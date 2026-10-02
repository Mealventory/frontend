const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function harness() {
  const slots = [];
  let cursor = 0;
  let reads = 0;
  let resolveRead;
  let nativeScheme = 'light';
  let systemScheme = 'light';
  let activePreference = 'system';
  const effects = [];
  const applied = [];
  const writes = [];

  const react = {
    createContext: () => ({ Provider: 'Provider' }),
    useRef(value) {
      const i = cursor++;
      return slots[i] ??= { current: value };
    },
    useState(value) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value;
      return [slots[i], next => { slots[i] = next; }];
    },
    useCallback(fn) { return fn; },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((value, index) => value !== slots[i][index])) {
        slots[i] = deps;
        effects.push(fn);
      }
    },
  };

  const applyNativeWindPreference = value => {
    applied.push(value);
    activePreference = value;
    nativeScheme = value === 'system' ? systemScheme : value;
  };

  const mocks = {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    nativewind: {
      useColorScheme: () => ({
        colorScheme: nativeScheme,
        setColorScheme: applyNativeWindPreference,
      }),
    },
    '@/src/lib/themeStorage': {
      getWebInitialPreference: () => null,
      themeStorage: {
        getPreference: () => {
          reads++;
          return new Promise(resolve => { resolveRead = resolve; });
        },
        setPreference: async pref => { writes.push(pref); },
      },
    },
  };

  const mod = new Module('theme-test');
  mod.require = name => {
    if (!(name in mocks)) throw Error(name);
    return mocks[name];
  };
  mod._compile(
    ts.transpileModule(
      fs.readFileSync('src/context/ThemeContext.tsx', 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }
    ).outputText,
    'theme-test'
  );

  return {
    render() {
      cursor = 0;
      const tree = mod.exports.ThemeProvider({ children: null });
      while (effects.length) effects.shift()();
      return tree.props.value;
    },
    resolve(value) { resolveRead(value); },
    systemAppearance(value) {
      systemScheme = value;
      if (activePreference === 'system') nativeScheme = value;
    },
    get reads() { return reads; },
    applied,
    writes,
  };
}

test('explicit theme selections update the same NativeWind appearance source', async () => {
  const h = harness();
  h.render();
  h.resolve('light');
  await Promise.resolve();

  let theme = h.render();
  assert.equal(theme.isDark, false);

  await theme.setThemePreference('dark');
  theme = h.render();
  assert.equal(theme.themePreference, 'dark');
  assert.equal(theme.colorScheme, 'dark');
  assert.equal(theme.isDark, true);

  await theme.setThemePreference('light');
  theme = h.render();
  assert.equal(theme.themePreference, 'light');
  assert.equal(theme.colorScheme, 'light');
  assert.equal(theme.isDark, false);

  assert.equal(h.reads, 1);
  assert.deepEqual(h.applied, ['light', 'dark', 'light']);
  assert.deepEqual(h.writes, ['dark', 'light']);
});

test('a delayed saved preference cannot overwrite a newer user selection', async () => {
  const h = harness();
  const theme = h.render();

  await theme.setThemePreference('dark');
  h.resolve('light');
  await Promise.resolve();

  const current = h.render();
  assert.equal(current.themePreference, 'dark');
  assert.equal(current.isDark, true);
  assert.deepEqual(h.applied, ['dark']);
});

test('system preference follows system appearance through NativeWind', async () => {
  const h = harness();
  h.render();
  h.resolve('system');
  await Promise.resolve();

  let theme = h.render();
  assert.equal(theme.themePreference, 'system');
  assert.equal(theme.isDark, false);

  h.systemAppearance('dark');
  theme = h.render();
  assert.equal(theme.themePreference, 'system');
  assert.equal(theme.colorScheme, 'dark');
  assert.equal(theme.isDark, true);

  h.systemAppearance('light');
  theme = h.render();
  assert.equal(theme.colorScheme, 'light');
  assert.equal(theme.isDark, false);
});

test('rapid theme selections persist in user-selection order', async () => {
  const h = harness();
  h.render();
  h.resolve('system');
  await Promise.resolve();

  const theme = h.render();
  const darkWrite = theme.setThemePreference('dark');
  const lightWrite = theme.setThemePreference('light');
  await Promise.all([darkWrite, lightWrite]);

  const current = h.render();
  assert.equal(current.themePreference, 'light');
  assert.equal(current.isDark, false);
  assert.deepEqual(h.writes, ['dark', 'light']);
  assert.deepEqual(h.applied, ['system', 'dark', 'light']);
});
