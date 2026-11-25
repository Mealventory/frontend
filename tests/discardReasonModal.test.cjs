const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");

const REASONS = [
  ["expired", "Expired"],
  ["spoiled", "Spoiled"],
  ["bought_too_much", "Bought too much"],
  ["didnt_like", "Didn't like it"],
  ["other", "Other"],
];

function loadPicker(platform) {
  const native = {
    Modal: "Modal",
    Pressable: "Pressable",
    ScrollView: "ScrollView",
    Text: "Text",
    View: "View",
    Platform: { OS: platform },
  };
  const mod = new Module("DiscardReasonModal");
  mod.require = (name) => {
    if (name === "react-native") return native;
    if (name === "react/jsx-runtime") {
      return {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
      };
    }
    throw new Error(`Unexpected import: ${name}`);
  };
  mod._compile(
    ts.transpileModule(
      fs.readFileSync("src/components/domain/DiscardReasonModal.tsx", "utf8"),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          jsx: ts.JsxEmit.ReactJSX,
        },
      }
    ).outputText,
    "DiscardReasonModal.cjs"
  );
  return mod.exports;
}

function tree(node) {
  if (Array.isArray(node)) return node.flatMap(tree);
  if (!node || typeof node !== "object") return [];
  return [node, ...tree(node.props?.children)];
}

for (const platform of ["ios", "android", "web"]) {
  test(`discard reason picker selects each reason and cancels on ${platform}`, () => {
    const { DiscardReasonModal, DISCARD_REASON_OPTIONS } = loadPicker(platform);
    assert.deepEqual(
      DISCARD_REASON_OPTIONS.map(({ reason, label }) => [reason, label]),
      REASONS
    );

    const selected = [];
    let cancelled = 0;
    const nodes = tree(
      DiscardReasonModal({
        visible: true,
        itemName: "Spinach",
        onSelect: (reason) => selected.push(reason),
        onCancel: () => { cancelled += 1; },
      })
    );
    const modal = nodes.find((node) => node.type === "Modal");
    assert.equal(modal.props.visible, true);
    assert.equal(modal.props.transparent, true);
    assert.equal(modal.props.animationType, "fade");
    assert.equal(typeof modal.props.onRequestClose, "function");

    for (const [reason] of REASONS) {
      const option = nodes.find((node) => node.props?.testID === `discard-reason-${reason}`);
      assert.ok(option, `missing ${reason} option on ${platform}`);
      assert.equal(option.props.accessibilityRole, "button");
      option.props.onPress();
    }
    assert.deepEqual(selected, REASONS.map(([reason]) => reason));

    nodes.find((node) => node.props?.testID === "discard-reason-cancel").props.onPress();
    assert.equal(cancelled, 1);
    modal.props.onRequestClose();
    assert.equal(cancelled, 2);
  });
}

test("both inventory discard flows use the shared picker instead of Alert.alert", () => {
  const card = fs.readFileSync("src/components/domain/PantryItemCard.tsx", "utf8");
  const detail = fs.readFileSync("app/(app)/inventory/[id].tsx", "utf8");
  for (const source of [card, detail]) {
    assert.match(source, /DiscardReasonModal/);
    assert.doesNotMatch(source, /Alert\.alert\(/);
  }
  assert.match(
    detail,
    /onSelect=\{\(reason\) => \{[\s\S]*?handleAction\("discard", reason\)/
  );
});
