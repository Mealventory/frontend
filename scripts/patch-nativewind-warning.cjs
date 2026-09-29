// NativeWind 4 / css-interop 0.2.7 warning serialization traverses React
// element owners, invoking React Navigation's intentionally throwing getters.
// Keep the warning, but log only the class names that caused the upgrade.
const fs = require('node:fs');
const path = require('node:path');
function patchWarning(source) {
  const old = '${stringify(originalProps)}';
  const safe = '${JSON.stringify({ className: originalProps?.className })}';
  if (source.includes(safe)) return source;
  if (!source.includes(old)) throw new Error('css-interop warning patch no longer matches; review dependency version.');
  return source.replace(old, safe);
}
if (require.main === module) {
  const root = path.dirname(require.resolve('react-native-css-interop/package.json'));
  for (const relative of ['dist/runtime/native/render-component.js', 'src/runtime/native/render-component.tsx']) {
    const file = path.join(root, relative);
    const before = fs.readFileSync(file, 'utf8');
    const after = patchWarning(before);
    if (after !== before) fs.writeFileSync(file, after);
  }
}
module.exports = { patchWarning };
