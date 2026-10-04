const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

function compile(path, mocks = {}) {
  const mod = new Module(path);
  mod.require = (name) => {
    if (name in mocks) return mocks[name];
    throw Error(name);
  };
  mod._compile(
    ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    path
  );
  return mod.exports;
}

function reactHarness() {
  let cursor = 0;
  const slots = [];
  return {
    react: {
      useState(value) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof value === "function" ? value() : value;
        return [slots[index], (next) => {
          slots[index] = typeof next === "function" ? next(slots[index]) : next;
        }];
      },
      useMemo(fn) {
        cursor++;
        return fn();
      },
      useEffect() {
        cursor++;
      },
    },
    reset() {
      cursor = 0;
    },
  };
}

function walk(node) {
  if (Array.isArray(node)) return node.flatMap(walk);
  if (!node || typeof node !== "object") return [];
  return [node, ...walk(node.props?.children)];
}

const cooking = compile("src/lib/cookingSession.ts");
const recipe = {
  id: "cook-one",
  name: "Test Pasta",
  time: "20 min",
  difficulty: "Easy",
  match: 100,
  uses: ["Pasta"],
  emoji: "🍝",
  tag: "Dinner",
  description: "Test recipe",
  steps: ["Simmer sauce for 2 minutes", "Add pasta", "Serve immediately"],
};

function modeHarness() {
  const hooks = reactHarness();
  const mocks = {
    react: hooks.react,
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    "react-native": { Text: "Text", TouchableOpacity: "TouchableOpacity", View: "View" },
    "react-native-safe-area-context": { SafeAreaView: "SafeAreaView" },
    "expo-keep-awake": { useKeepAwake: () => {} },
    "@/src/components/atoms/Icon": { Icon: "Icon" },
    "@/src/lib/cookingSession": cooking,
  };
  const View = compile("src/components/domain/CookingModeView.tsx", mocks).CookingModeView;
  let finished = 0;
  let backed = 0;
  function render() {
    hooks.reset();
    return walk(View({ recipe, onBack: () => backed++, onFinish: () => finished++ }));
  }
  return { render, get finished() { return finished; }, get backed() { return backed; } };
}

test("recipe detail exposes Start Cooking when a launch handler is provided", () => {
  const hooks = reactHarness();
  let starts = 0;
  const Detail = compile("src/components/domain/RecipeDetailView.tsx", {
    react: hooks.react,
    "react/jsx-runtime": {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    "react-native": {
      View: "View",
      Text: "Text",
      ScrollView: "ScrollView",
      TouchableOpacity: "TouchableOpacity",
      ActivityIndicator: "ActivityIndicator",
    },
    "@/src/types": {},
    "@/src/lib/layout": { APP_GUTTER: 16, APP_PAGE_TOP: 20 },
    "../atoms/Icon": { Icon: "Icon" },
  }).RecipeDetailView;
  hooks.reset();
  const nodes = walk(Detail({
    recipe,
    inventoryItemNames: new Set(["pasta"]),
    onBack: () => {},
    onStartCooking: () => starts++,
  }));
  const start = nodes.find((node) => node.props?.accessibilityLabel === "Start cooking Test Pasta");
  assert.ok(start);
  start.props.onPress();
  assert.equal(starts, 1);
});

test("cooking mode moves between steps and restores progress after reopening", () => {
  cooking.clearCookingSession(recipe.id);
  const first = modeHarness();
  let nodes = first.render();
  nodes.find((node) => node.props?.accessibilityLabel === "Next cooking step").props.onPress();
  nodes = first.render();
  assert.ok(nodes.find((node) => node.type === "Text" && node.props?.children === "Step 2"));

  const reopened = modeHarness();
  nodes = reopened.render();
  assert.ok(nodes.find((node) => node.type === "Text" && node.props?.children === "Step 2"));
  cooking.clearCookingSession(recipe.id);
});

test("timed steps can start and cancel a timer without leaving cooking mode", () => {
  cooking.clearCookingSession(recipe.id);
  const h = modeHarness();
  let nodes = h.render();
  const start = nodes.find((node) => node.props?.accessibilityLabel === "Start 2:00 cooking timer");
  assert.ok(start);
  start.props.onPress();

  nodes = h.render();
  const cancel = nodes.find((node) => node.props?.accessibilityLabel === "Cancel cooking timer");
  assert.ok(cancel);
  cancel.props.onPress();

  nodes = h.render();
  assert.ok(nodes.find((node) => node.props?.accessibilityLabel === "Start 2:00 cooking timer"));
  cooking.clearCookingSession(recipe.id);
});

test("finish meal opens review without discarding cooking progress", () => {
  cooking.clearCookingSession(recipe.id);
  cooking.saveCookingStep(recipe.id, 2, recipe.steps.length);
  const h = modeHarness();
  const nodes = h.render();
  const finish = nodes.find((node) => node.props?.accessibilityLabel === "Finish meal");
  assert.ok(finish);
  finish.props.onPress();
  assert.equal(h.finished, 1);
  assert.equal(cooking.readCookingSession(recipe.id, recipe.steps.length).stepIndex, 2);
});
