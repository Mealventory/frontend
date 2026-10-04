const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("application gutter stays at the 16px mobile baseline", () => {
  const layout = fs.readFileSync("src/lib/layout.ts", "utf8");
  assert.match(layout, /APP_GUTTER\s*=\s*16/);
});

test("primary tab screens use the shared application gutter", () => {
  for (const file of [
    "app/(app)/(tabs)/index.tsx",
    "app/(app)/(tabs)/recipes.tsx",
    "app/(app)/(tabs)/shopping.tsx",
    "app/(app)/(tabs)/settings.tsx",
  ]) {
    const source = fs.readFileSync(file, "utf8");
    assert.ok(source.includes("APP_GUTTER"), `${file} should use APP_GUTTER`);
    assert.ok(
      !source.includes("contentContainerStyle={{ padding: 20"),
      `${file} should not restore the old 20px page padding`
    );
  }
});

test("form scroll views keep max-width on the viewport, not the content container", () => {
  for (const file of [
    "app/(app)/inventory/edit.tsx",
    "app/(modal)/manual-add.tsx",
    "src/components/layout/RoutePlaceholder.tsx",
    "app/(app)/household/members.tsx",
  ]) {
    const source = fs.readFileSync(file, "utf8");
    assert.ok(
      source.includes("style={{ width:") && source.includes("maxWidth:"),
      `${file} should cap the ScrollView itself on wide screens`
    );
    assert.ok(
      source.includes("paddingHorizontal: APP_GUTTER"),
      `${file} should use the shared mobile gutter`
    );

    const contentStyle = source.match(/contentContainerStyle=\{\{([\s\S]*?)\}\}/)?.[1] || "";
    assert.ok(
      !contentStyle.includes("maxWidth") && !contentStyle.includes("alignSelf"),
      `${file} should not constrain the scroll content container`
    );
  }
});

test("secondary screens use the same tighter page gutter", () => {
  for (const file of [
    "app/(app)/activity.tsx",
    "app/(app)/expiry-calendar.tsx",
    "app/(app)/scan-history/index.tsx",
    "app/(app)/scan-history/[id].tsx",
    "app/(app)/inventory/[id].tsx",
    "app/(app)/meal-plan.tsx",
    "src/components/domain/RecipeDetailView.tsx",
  ]) {
    const source = fs.readFileSync(file, "utf8");
    assert.ok(
      source.includes("APP_GUTTER") || source.includes('px-4'),
      `${file} should use the standardized 16px gutter`
    );
  }
});

test("root household flow separates wide-screen centering from scroll padding", () => {
  const root = fs.readFileSync("app/index.tsx", "utf8");
  assert.ok(root.includes("style={styles.scrollFrame}"));
  assert.ok(root.includes("paddingHorizontal: APP_GUTTER"));
  assert.ok(root.includes('scrollFrame: { width: "100%", maxWidth: 560, alignSelf: "center" }'));
  assert.ok(!root.includes('maxWidth: 560, alignSelf: "center", paddingHorizontal: 24'));
});
