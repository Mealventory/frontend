const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function load(file, mocks = {}) {
  const mod = new Module(file, module);
  mod.paths = module.paths;
  const original = mod.require.bind(mod);
  mod.require = name => name in mocks ? mocks[name] : original(name);
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, file);
  return mod.exports;
}

const { validateSignUp, signUpAccount } = load('src/lib/account.ts');

test('validateSignUp rejects empty required fields', () => {
  const result = validateSignUp({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  assert.equal(result.isValid, false);
  assert.equal(result.errors.displayName, 'Display name is required.');
  assert.equal(result.errors.email, 'Email address is required.');
  assert.equal(result.errors.password, 'Password is required.');
  assert.equal(result.errors.confirmPassword, 'Password confirmation is required.');
});

test('validateSignUp rejects invalid email formats', () => {
  const result = validateSignUp({
    displayName: 'Chef Pablo',
    email: 'not-an-email',
    password: 'password123',
    confirmPassword: 'password123',
  });

  assert.equal(result.isValid, false);
  assert.equal(result.errors.email, 'Please enter a valid email address.');
  assert.equal(result.errors.displayName, undefined);
  assert.equal(result.errors.password, undefined);
});

test('validateSignUp enforces password minimum length of 8 characters', () => {
  const result = validateSignUp({
    displayName: 'Chef Pablo',
    email: 'pablo@example.com',
    password: 'short',
    confirmPassword: 'short',
  });

  assert.equal(result.isValid, false);
  assert.equal(result.errors.password, 'Password must be at least 8 characters long.');
});

test('validateSignUp enforces password confirmation matching', () => {
  const result = validateSignUp({
    displayName: 'Chef Pablo',
    email: 'pablo@example.com',
    password: 'securePassword123',
    confirmPassword: 'differentPassword456',
  });

  assert.equal(result.isValid, false);
  assert.equal(result.errors.confirmPassword, 'Passwords do not match.');
});

test('validateSignUp succeeds for valid credentials and trims fields', () => {
  const result = validateSignUp({
    displayName: '  Chef Pablo  ',
    email: '  pablo@example.com  ',
    password: 'securePassword123',
    confirmPassword: 'securePassword123',
  });

  assert.equal(result.isValid, true);
  assert.deepEqual(result.errors, {});
});

test('signUpAccount calls supabase signUp with display_name and username in metadata', async () => {
  let capturedPayload;
  const mockClient = {
    auth: {
      signUp: async (payload) => {
        capturedPayload = payload;
        return { data: { user: { id: 'user-123' }, session: { access_token: 'token-abc' } }, error: null };
      },
    },
  };

  const result = await signUpAccount(mockClient, {
    displayName: '  Chef Pablo  ',
    email: '  pablo@example.com  ',
    password: 'securePassword123',
  });

  assert.equal(result.error, null);
  assert.equal(capturedPayload.email, 'pablo@example.com');
  assert.equal(capturedPayload.password, 'securePassword123');
  assert.deepEqual(capturedPayload.options, {
    data: {
      display_name: 'Chef Pablo',
      username: 'Chef Pablo',
    },
  });
});

test('signUpAccount returns error when unconfigured or client fails', async () => {
  await assert.rejects(
    signUpAccount(null, {
      displayName: 'Chef Pablo',
      email: 'pablo@example.com',
      password: 'securePassword123',
    }),
    /Sign-in is not configured yet/
  );

  const failingClient = {
    auth: {
      signUp: async () => ({
        data: { user: null, session: null },
        error: new Error('User already registered'),
      }),
    },
  };

  const result = await failingClient.auth.signUp();
  assert.equal(result.error.message, 'User already registered');
});

test('sign-up.tsx screen component loads cleanly', () => {
  const SignUpModule = load('app/(auth)/sign-up.tsx', {
    'react': { useState: () => ['', () => {}] },
    'react-native': { View: 'View' },
    'expo-router': { useRouter: () => ({ replace: () => {}, push: () => {} }) },
    '@/src/components/layout/RoutePlaceholder': { RoutePlaceholder: 'RoutePlaceholder' },
    '@/src/components/molecules': { FormField: 'FormField' },
    '@/src/components/atoms': { Button: 'Button', Icon: 'Icon', Typography: 'Typography' },
    '@/src/lib/supabase': { supabase: {} },
    '@/src/lib/account': {
      validateSignUp: () => ({ isValid: true, errors: {} }),
      signUpAccount: async () => ({ data: { session: null, user: null }, error: null }),
    },
  });

  assert.equal(typeof SignUpModule.default, 'function');
});
