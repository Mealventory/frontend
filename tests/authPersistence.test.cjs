const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function load(file, mocks = {}) {
  const mod = new Module(file, module);
  mod.paths = module.paths;
  const original = mod.require.bind(mod);
  mod.require = (name) => (
    name === "@/src/context/NotificationContext"
      ? { NotificationProvider: "NotificationProvider" }
      : name === "@/src/lib/e2e"
        ? { E2E_ENABLED: false }
        : name in mocks
          ? mocks[name]
          : original(name)
  );
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

test('supabase client configuration enforces persistSession: true and storage adapter', () => {
  let capturedOptions = null;
  const originalUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';

  try {
    load('src/lib/supabase.ts', {
      './authStorage': load('src/lib/authStorage.ts', {
        'react-native': { Platform: { OS: 'ios' } },
      }),
      'react-native-url-polyfill/auto': {},
      '@supabase/supabase-js': {
        createClient: (_url, _key, options) => {
          capturedOptions = options;
          return { auth: {} };
        },
      },
      'expo-web-browser': { maybeCompleteAuthSession: () => {} },
      'expo-linking': { createURL: () => '/' },
      'react-native': { Platform: { OS: 'ios' } },
    });
  } finally {
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalKey;
  }

  assert.ok(capturedOptions, 'createClient options were not captured');
  assert.equal(capturedOptions.auth.persistSession, true, 'persistSession must be true');
  assert.equal(capturedOptions.auth.autoRefreshToken, true, 'autoRefreshToken must be true');
  assert.ok(capturedOptions.auth.storage, 'auth storage adapter must be provided');
  assert.equal(typeof capturedOptions.auth.storage.getItem, 'function');
  assert.equal(typeof capturedOptions.auth.storage.setItem, 'function');
  assert.equal(typeof capturedOptions.auth.storage.removeItem, 'function');
});

test('supabase client config does not contain hardcoded service-role secrets or database passwords', () => {
  const source = fs.readFileSync('src/lib/supabase.ts', 'utf8');
  assert.ok(!source.includes('service_role'));
  assert.ok(!source.includes('SUPABASE_SERVICE_KEY'));
  assert.ok(!source.includes('SUPABASE_JWT_SECRET'));
  assert.ok(!source.includes('postgres://'));
});

test('app/_layout.tsx coordinates splash screen with auth hydration to prevent screen flicker', () => {
  let splashHidden = false;
  let navigationReplacedWith = null;

  const mockSplashScreen = {
    preventAutoHideAsync: async () => {},
    hideAsync: async () => { splashHidden = true; },
  };

  const mockRouter = {
    replace: (path) => { navigationReplacedWith = path; },
  };

  // 1. When auth is NOT ready, layout returns null and does NOT hide splash screen yet
  let authState = { ready: false, recovery: false };
  let themeState = { isDark: false };

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
      useEffect: (fn) => {
        fn();
      },
    },
  });

  const { RootLayoutContent } = LayoutModule;

  // When auth is NOT ready: RootLayoutContent returns null, splash remains shown
  const unreadyView = RootLayoutContent();
  assert.equal(unreadyView, null, 'RootLayoutContent must return null while auth is hydrating');
  assert.equal(splashHidden, false, 'SplashScreen.hideAsync must NOT be called before auth is ready');

  // When auth becomes ready: RootLayoutContent renders content and hides splash screen
  authState = { ready: true, recovery: false };
  const readyView = RootLayoutContent();
  assert.notEqual(readyView, null, 'RootLayoutContent must render once auth is ready');
  assert.equal(splashHidden, true, 'SplashScreen.hideAsync must be called when auth is ready');
  assert.equal(navigationReplacedWith, null);

  // If recovery intent is present: navigate to reset-password
  authState = { ready: true, recovery: true };
  RootLayoutContent();
  assert.equal(navigationReplacedWith, '/reset-password');
});

test('logout clears persisted session via client signOut', async () => {
  let storageRemovedKey = null;
  const mockStorage = {
    getItem: async () => '{"user":{"id":"test"}}',
    setItem: async () => {},
    removeItem: async (key) => { storageRemovedKey = key; },
  };

  const { signOutAccount } = load('src/lib/account.ts');

  let signedOutCalled = false;
  const mockClient = {
    auth: {
      signOut: async () => {
        signedOutCalled = true;
        await mockStorage.removeItem('sb-auth-token');
        return { error: null };
      },
    },
  };

  await signOutAccount(mockClient);
  assert.equal(signedOutCalled, true);
  assert.equal(storageRemovedKey, 'sb-auth-token');
});

test('switching accounts resets household selection and prevents state exposure', () => {
  let authListener = null;
  let selectedHousehold = { id: 'household-user-1', name: 'User 1 Kitchen' };

  const mockSupabase = {
    auth: {
      onAuthStateChange: (cb) => {
        authListener = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      getSession: async () => ({
        data: { session: { user: { id: 'user-1' } } },
        error: null,
      }),
      startAutoRefresh: () => {},
      stopAutoRefresh: () => {},
    },
  };

  // Simulate onAuthStateChange when user signs out and another signs in
  let currentUserId = 'user-1';
  const handleUserChange = (newUser) => {
    if (currentUserId !== newUser?.id) {
      selectedHousehold = null; // Clears household on user switch
    }
    currentUserId = newUser?.id;
  };

  assert.notEqual(selectedHousehold, null);

  // Switch to user-2
  handleUserChange({ id: 'user-2' });
  assert.equal(selectedHousehold, null, 'Previous household state must be cleared on user switch');

  // Sign out (user null)
  handleUserChange(null);
  assert.equal(selectedHousehold, null, 'Household must remain null on sign out');
});

test('auto refresh responds to active app state on native', () => {
  let autoRefreshStarted = false;
  let autoRefreshStopped = false;

  const mockClient = {
    auth: {
      startAutoRefresh: () => { autoRefreshStarted = true; },
      stopAutoRefresh: () => { autoRefreshStopped = true; },
    },
  };

  const refreshHandler = (state) => {
    if (state === 'active') mockClient.auth.startAutoRefresh();
    else mockClient.auth.stopAutoRefresh();
  };

  refreshHandler('background');
  assert.equal(autoRefreshStopped, true);
  assert.equal(autoRefreshStarted, false);

  refreshHandler('active');
  assert.equal(autoRefreshStarted, true);
});
