const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function renderSelector({ preference = 'system', isDark = false } = {}) {
  const selections = [];
  const jsx = (type, props) => ({ type, props: props || {} });
  const mocks = {
    react: {},
    'react/jsx-runtime': {
      jsx,
      jsxs: jsx,
      Fragment: 'Fragment',
    },
    'react-native': {
      TouchableOpacity: 'TouchableOpacity',
      Text: 'Text',
      View: 'View',
      StyleSheet: { create: value => value },
    },
    '@/src/context/ThemeContext': {
      useAppTheme: () => ({
        themePreference: preference,
        isDark,
        setThemePreference: async value => { selections.push(value); },
      }),
    },
    '../atoms/Icon': { Icon: 'Icon' },
  };

  const mod = new Module('theme-selector-test');
  mod.require = name => {
    if (!(name in mocks)) throw Error(name);
    return mocks[name];
  };
  mod._compile(
    ts.transpileModule(
      fs.readFileSync('src/components/molecules/ThemeSelector.tsx', 'utf8'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
      }
    ).outputText,
    'theme-selector-test'
  );

  const tree = mod.exports.ThemeSelector();

  function walk(node, output = []) {
    if (node == null || typeof node !== 'object') return output;
    output.push(node);
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      if (Array.isArray(child)) {
        for (const nested of child) walk(nested, output);
      } else {
        walk(child, output);
      }
    }
    return output;
  }

  return { nodes: walk(tree), selections };
}

test('theme selector exposes one accessible radio for every appearance choice', () => {
  const { nodes } = renderSelector({ preference: 'light' });
  const radios = nodes.filter(node => node.type === 'TouchableOpacity');

  assert.deepEqual(
    radios.map(node => node.props.accessibilityLabel),
    ['System appearance', 'Light appearance', 'Dark appearance']
  );
  assert.deepEqual(
    radios.map(node => node.props.accessibilityState),
    [{ checked: false }, { checked: true }, { checked: false }]
  );
});

test('theme selector delegates selections to ThemeContext', () => {
  const { nodes, selections } = renderSelector({ preference: 'system', isDark: true });
  const dark = nodes.find(node => node.props?.accessibilityLabel === 'Dark appearance');

  assert.ok(dark);
  dark.props.onPress();
  assert.deepEqual(selections, ['dark']);
});

test('theme selector relies on resilient theme storage instead of unreachable local error UI', () => {
  const source = fs.readFileSync('src/components/molecules/ThemeSelector.tsx', 'utf8');
  assert.ok(!source.includes('useState'));
  assert.ok(!source.includes('Could not change appearance'));
  assert.ok(source.includes('void setThemePreference(option.id)'));
});
