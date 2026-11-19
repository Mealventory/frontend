const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const expiryField = fs.readFileSync("src/components/molecules/ExpiryDateField.tsx", "utf8");
const manual = fs.readFileSync("app/(modal)/manual-add.tsx", "utf8");
const edit = fs.readFileSync("app/(app)/inventory/edit.tsx", "utf8");

test("expiry field forwards native focus and blur so parent forms can reveal it", () => {
  assert.match(expiryField, /onInputFocus\?: \(\) => void/);
  assert.match(expiryField, /onInputBlur\?: \(\) => void/);
  assert.match(expiryField, /onFocus=\{onInputFocus\}/);
  assert.match(expiryField, /onInputBlur\?\.\(\)/);
  assert.match(expiryField, /normalizeExpiryDate\(value\)/);
});

for (const [label, source] of [
  ["manual add", manual],
  ["edit item", edit],
]) {
  test(label + " reveals expiry date above the iPhone keyboard", () => {
    assert.match(source, /<KeyboardAvoidingView/);
    assert.match(source, /behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);
    assert.match(source, /<ScrollView\s+ref=\{scrollRef\}/);
    assert.match(source, /keyboardShouldPersistTaps="handled"/);
    assert.match(source, /keyboardDismissMode=\{Platform\.OS === 'ios' \? 'interactive' : 'on-drag'\}/);
    assert.match(source, /Keyboard\.addListener\('keyboardDidShow'/);
    assert.match(source, /if \(expiryInputFocused\.current\) \{/);
    assert.match(source, /scrollRef\.current\?\.scrollToEnd\(\{ animated: true \}\)/);
    assert.match(source, /onInputFocus=\{\(\) => \{/);
    assert.match(source, /onInputBlur=\{\(\) => \{ expiryInputFocused\.current = false; \}\}/);
    assert.match(source, /listener\.remove\(\)/);
  });
}
