const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(tsx|ts)$/.test(entry.name) ? [full] : [];
  });
}

function jsxTagName(node) {
  return node.tagName && typeof node.tagName.getText === "function"
    ? node.tagName.getText()
    : "";
}

function attributeNames(node) {
  const attrs = node.attributes?.properties || [];
  return new Set(
    attrs
      .filter(attr => ts.isJsxAttribute(attr))
      .map(attr => attr.name.getText())
  );
}

function inspectFile(file) {
  const source = fs.readFileSync(file, "utf8");
  const root = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const findings = [];

  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = jsxTagName(node);
      const attrs = attributeNames(node);

      if (tag === "TouchableOpacity" || tag === "Pressable") {
        if (!attrs.has("accessibilityRole")) {
          findings.push(`${tag} missing accessibilityRole at ${file}:${root.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
        }
      }

      if (tag === "TextInput" && !attrs.has("accessibilityLabel")) {
        findings.push(`TextInput missing accessibilityLabel at ${file}:${root.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(root);
  return findings;
}

test("production interactive controls expose accessibility roles and text inputs are labeled", () => {
  const files = [...walk("app"), ...walk("src/components")];
  const findings = files.flatMap(inspectFile);
  assert.deepEqual(findings, []);
});

test("shared button and input primitives announce labels, states, and errors", () => {
  const button = fs.readFileSync("src/components/atoms/Button.tsx", "utf8");
  const input = fs.readFileSync("src/components/atoms/Input.tsx", "utf8");

  assert.ok(button.includes("accessibilityLabel={accessibilityLabel || label}"));
  assert.ok(button.includes("busy: loading"));
  assert.ok(input.includes('accessibilityRole="alert"'));
  assert.ok(input.includes('accessibilityLiveRegion="assertive"'));
});

test("critical scanner and review controls retain explicit screen-reader semantics", () => {
  for (const file of [
    "app/(app)/(tabs)/scan.tsx",
    "app/(modal)/scanner.tsx",
  ]) {
    const source = fs.readFileSync(file, "utf8");
    assert.ok(source.includes('accessibilityRole="radio"'));
    assert.ok(source.includes('accessibilityLabel={`${m.label} scan mode`}'));
    assert.ok(source.includes('accessibilityLiveRegion="assertive"'));
    assert.ok(source.includes("min-h-[44px]"));
  }

  const review = fs.readFileSync(
    "src/components/organisms/ReceiptReviewSheet.tsx",
    "utf8"
  );
  assert.ok(review.includes('accessibilityRole="radio"'));
  assert.ok(review.includes('label={`Include ${item.name}`}'));
  assert.ok(review.includes('accessibilityLiveRegion="assertive"'));
  assert.ok(review.includes('className="w-11 h-11'));
});

test("key icon targets meet the 44 point touch target baseline", () => {
  const detail = fs.readFileSync("app/(app)/inventory/[id].tsx", "utf8");
  const recipe = fs.readFileSync(
    "src/components/domain/RecipeDetailView.tsx",
    "utf8"
  );
  const member = fs.readFileSync(
    "src/components/domain/MemberDetailSheet.tsx",
    "utf8"
  );

  assert.ok(detail.includes('className="w-11 h-11'));
  assert.ok(!detail.includes('w-[38px] h-[38px]'));
  assert.ok(recipe.includes('className="w-11 h-11'));
  assert.ok(member.includes('className="w-11 h-11 rounded-full'));
});

test("item and recipe names can wrap for larger system text", () => {
  const food = fs.readFileSync("src/components/domain/FoodItemCard.tsx", "utf8");
  const recipe = fs.readFileSync("src/components/domain/RecipeCard.tsx", "utf8");
  const item = fs.readFileSync("src/components/molecules/ItemCard.tsx", "utf8");

  assert.ok(food.includes("numberOfLines={2}"));
  assert.ok(recipe.includes("numberOfLines={2}"));
  assert.ok(item.includes("numberOfLines={2}"));
});
