const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const login = fs.readFileSync('app/index.tsx', 'utf8');
const recovery = fs.readFileSync('app/reset-password.tsx', 'utf8');
const layout = fs.readFileSync('app/_layout.tsx', 'utf8');

test('login uses the hydrated app theme rather than a separate default', () => {
  assert.match(login, /import \{ useAppTheme \} from ['"]@\/src\/context\/ThemeContext['"]/);
  assert.match(login, /function Action\([\s\S]*?const \{ isDark \} = useAppTheme\(\)/);
  assert.match(login, /function HouseholdScreen\([\s\S]*?const \{ isDark \} = useAppTheme\(\)/);
  assert.match(login, /const styles = getLoginStyles\(isDark\)/);
  assert.match(layout, /const isAppReady = authReady && \(themeReady \?\? true\)/);
  assert.match(layout, /if \(!isAppReady\) \{\s*return null;/);
});

test('login, create account and kitchen selection have dark foreground and surface colours', () => {
  assert.match(login, /if \(!isDark\) return lightStyles/);
  for (const key of [
    'safe', 'headerWrapper', 'title', 'subtitle', 'heroIllustration',
    'card', 'heading', 'muted', 'label', 'input', 'secondary', 'link',
    'householdCard', 'householdName', 'cardTitle', 'empty', 'center',
  ]) {
    assert.match(login, new RegExp(`\\b${key}: \\[lightStyles\\.${key}, darkStyles\\.${key}\\]`));
  }
  assert.match(login, /darkStyles = StyleSheet\.create\(/);
  assert.match(login, /input: \{ color: '#F8FAFC', backgroundColor: '#1E293B', borderColor: '#475569' \}/);
  assert.match(login, /placeholderTextColor=\{placeholderColor\}/);
  assert.match(login, /secondary && \{ color: isDark \? '#34D399' : green \}/);
});

test('password recovery matches the app theme and renders readable labels', () => {
  assert.match(recovery, /useAppTheme\(\)/);
  assert.match(recovery, /const styles = isDark \? darkStyles : lightStyles/);
  assert.match(recovery, /backgroundColor: '#020617'/);
  assert.match(recovery, /color: '#F8FAFC'/);
  assert.match(recovery, /placeholderTextColor=\{placeholderColor\}/);
  assert.match(recovery, /styles\.body/);
});
