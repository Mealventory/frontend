const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function load(file, mocks = {}) {
  const mod = new Module(file, module);
  mod.paths = module.paths;
  const original = mod.require.bind(mod);
  mod.require = (name) => (name in mocks ? mocks[name] : original(name));
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    file
  );
  return mod.exports;
}

const {
  THEME_STORAGE_KEY,
  createThemeStorage,
  isValidThemePreference,
  getWebInitialPreference,
} = load('src/lib/themeStorage.ts', {
  'react-native': { Platform: { OS: 'ios' } },
});

test('isValidThemePreference accepts only valid theme modes', () => {
  assert.equal(isValidThemePreference('system'), true);
  assert.equal(isValidThemePreference('light'), true);
  assert.equal(isValidThemePreference('dark'), true);
  assert.equal(isValidThemePreference('blue'), false);
  assert.equal(isValidThemePreference(''), false);
  assert.equal(isValidThemePreference(null), false);
  assert.equal(isValidThemePreference(undefined), false);
  assert.equal(isValidThemePreference(123), false);
});

test('themeStorage persists theme preference locally under independent storage key', async () => {
  const mockStorageMap = new Map();
  const mockSecureStore = {
    getItemAsync: async (k) => mockStorageMap.get(k) ?? null,
    setItemAsync: async (k, v) => { mockStorageMap.set(k, v); },
    deleteItemAsync: async (k) => { mockStorageMap.delete(k); },
  };

  const storage = createThemeStorage(mockSecureStore);

  // Initial read when empty
  assert.equal(await storage.getPreference(), null);

  // Set dark preference
  await storage.setPreference('dark');
  assert.equal(mockStorageMap.get(THEME_STORAGE_KEY), 'dark');
  assert.equal(await storage.getPreference(), 'dark');

  // Set light preference
  await storage.setPreference('light');
  assert.equal(mockStorageMap.get(THEME_STORAGE_KEY), 'light');
  assert.equal(await storage.getPreference(), 'light');

  // Set system preference
  await storage.setPreference('system');
  assert.equal(mockStorageMap.get(THEME_STORAGE_KEY), 'system');
  assert.equal(await storage.getPreference(), 'system');

  // Clear preference
  await storage.clearPreference();
  assert.equal(mockStorageMap.has(THEME_STORAGE_KEY), false);
  assert.equal(await storage.getPreference(), null);
});

test('themeStorage falls back gracefully on corrupted values or storage errors', async () => {
  const mockStorageMap = new Map();
  mockStorageMap.set(THEME_STORAGE_KEY, 'corrupted_theme_data');
  const mockSecureStore = {
    getItemAsync: async (k) => mockStorageMap.get(k) ?? null,
    setItemAsync: async (k, v) => { mockStorageMap.set(k, v); },
    deleteItemAsync: async (k) => { mockStorageMap.delete(k); },
  };

  const storage = createThemeStorage(mockSecureStore);
  assert.equal(await storage.getPreference(), null);

  // Storage throwing an exception
  const failingStore = {
    getItemAsync: async () => { throw new Error('Hardware failure'); },
    setItemAsync: async () => { throw new Error('Hardware failure'); },
    deleteItemAsync: async () => { throw new Error('Hardware failure'); },
  };
  const failingStorage = createThemeStorage(failingStore);
  assert.equal(await failingStorage.getPreference(), null);
  await assert.doesNotReject(async () => {
    await failingStorage.setPreference('dark');
  });
});

test('theme storage is independent from sensitive auth credentials and not cleared on logout', async () => {
  const nativeStore = new Map();
  const mockSecureStore = {
    getItemAsync: async (k) => nativeStore.get(k) ?? null,
    setItemAsync: async (k, v) => { nativeStore.set(k, v); },
    deleteItemAsync: async (k) => { nativeStore.delete(k); },
  };

  const themeStore = createThemeStorage(mockSecureStore);
  await themeStore.setPreference('dark');

  // Verify theme key does not conflict with auth tokens
  assert.equal(nativeStore.has(THEME_STORAGE_KEY), true);
  assert.ok(!THEME_STORAGE_KEY.includes('auth'));
  assert.ok(!THEME_STORAGE_KEY.includes('sb-'));

  // Simulate user logout
  const { signOutAccount } = load('src/lib/account.ts');
  const mockClient = {
    auth: {
      signOut: async () => {
        // Auth adapter clears auth token, not theme
        nativeStore.delete('sb-auth-token');
        return { error: null };
      },
    },
  };

  await signOutAccount(mockClient);

  // Theme preference must survive logout intact!
  assert.equal(nativeStore.get(THEME_STORAGE_KEY), 'dark');
  assert.equal(await themeStore.getPreference(), 'dark');
});

test('web initial preference reads synchronously from localStorage to prevent layout flash', () => {
  const webMap = new Map();
  webMap.set(THEME_STORAGE_KEY, 'dark');

  const mockWebStorage = {
    getItem: (k) => webMap.get(k) ?? null,
    setItem: (k, v) => { webMap.set(k, v); },
    removeItem: (k) => { webMap.delete(k); },
  };

  const initial = getWebInitialPreference(mockWebStorage);
  assert.equal(initial, 'dark');
});

test('ThemeContext exposes distinction between system, light, and dark preferences', () => {
  const source = fs.readFileSync('src/context/ThemeContext.tsx', 'utf8');
  assert.ok(source.includes('ThemePreference = "system" | "light" | "dark"'));
  assert.ok(source.includes('themePreference: ThemePreference'));
  assert.ok(source.includes('setThemePreference: (pref: ThemePreference)'));
  assert.ok(source.includes('Appearance.addChangeListener'));
});

test('app/_layout.tsx waits for theme hydration before revealing UI and hiding splash screen', () => {
  let splashHidden = false;

  const mockSplashScreen = {
    preventAutoHideAsync: async () => {},
    hideAsync: async () => { splashHidden = true; },
  };

  const mockRouter = { replace: () => {} };

  let authState = { ready: true, recovery: false };
  let themeState = { isDark: true, ready: false }; // Theme still restoring!

  const LayoutModule = load('app/_layout.tsx', {
    '../global.css': {},
    'expo-splash-screen': mockSplashScreen,
    'expo-router': {
      useRouter: () => mockRouter,
      usePathname: () => '/',
      Stack: Object.assign(() => ({ type: 'Stack' }), { Screen: () => null }),
    },
    'expo-status-bar': { StatusBar: () => null },
    '@expo-google-fonts/inter': {
      useFonts: () => [true, null],
      Inter_400Regular: {},
      Inter_600SemiBold: {},
      Inter_700Bold: {},
    },
    '@/src/context/ThemeContext': {
      ThemeProvider: ({ children }) => children,
      useAppTheme: () => themeState,
    },
    '@/src/context/InventoryContext': {
      InventoryProvider: ({ children }) => children,
    },
    '@/src/context/AuthContext': {
      AuthProvider: ({ children }) => children,
      useAuth: () => authState,
    },
    'react': {
      ...require('react'),
      useEffect: (fn) => { fn(); },
    },
  });

  const { RootLayoutContent } = LayoutModule;

  // 1. When auth is ready but theme is NOT ready, layout must remain null and splash kept shown
  const themeHydratingView = RootLayoutContent();
  assert.equal(themeHydratingView, null, 'UI must not render while theme preference is restoring');
  assert.equal(splashHidden, false, 'Splash screen must not hide before theme is restored');

  // 2. When both auth and theme are ready, UI renders and splash hides smoothly
  themeState = { isDark: true, ready: true };
  const readyView = RootLayoutContent();
  assert.notEqual(readyView, null, 'UI renders once both auth and theme are restored');
  assert.equal(splashHidden, true, 'Splash screen hides once theme is restored');
});

test('Settings screen offers System, Light, and Dark appearance selector', () => {
  const settingsTabSource = fs.readFileSync('app/(app)/(tabs)/settings.tsx', 'utf8');
  assert.ok(settingsTabSource.includes('themePreference'));
  assert.ok(settingsTabSource.includes('setThemePreference'));
  assert.ok(settingsTabSource.includes('"system"'));
  assert.ok(settingsTabSource.includes('"light"'));
  assert.ok(settingsTabSource.includes('"dark"'));

  const settingsScreenSource = fs.readFileSync('src/screens/SettingsScreen.tsx', 'utf8');
  assert.ok(settingsScreenSource.includes('themePreference'));
  assert.ok(settingsScreenSource.includes('setThemePreference'));
  assert.ok(settingsScreenSource.includes('"system"'));
  assert.ok(settingsScreenSource.includes('"light"'));
  assert.ok(settingsScreenSource.includes('"dark"'));
});

test('global.css defines both media query and class-based dark mode tokens', () => {
  const globalCss = fs.readFileSync('global.css', 'utf8');
  assert.ok(globalCss.includes(':root[class~="dark"]'));
  assert.ok(globalCss.includes('@media (prefers-color-scheme: dark)'));
  assert.ok(globalCss.includes('--color-ground-canvas'));
  assert.ok(globalCss.includes('--color-brand-500'));
});
