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
const { usernameFor, signOutAccount, changePassword, acceptRecoveryLink } = load('src/lib/account.ts');
test('optional usernames fall back to the email prefix', () => {
  assert.equal(usernameFor(' chef@example.com ', '  '), 'chef');
  assert.equal(usernameFor('chef@example.com', ' Alex '), 'Alex');
});
test('failed logout is reported instead of pretending the session ended', async () => {
  await assert.rejects(signOutAccount({ auth: { signOut: async () => ({ error: new Error('Offline') }) } }), /Offline/);
  await assert.rejects(signOutAccount(null), /not configured/);
  await signOutAccount({ auth: { signOut: async () => ({ error: null }) } });
});
test('password validation prevents requests, and server errors remain visible', async () => {
  let calls = 0;
  const client = { auth: { updateUser: async ({ password }) => {
    calls++; assert.equal(password, 'new-password'); return { error: new Error('Password policy') };
  } } };
  await assert.rejects(changePassword(client, 'short', 'short'), /6 characters/);
  await assert.rejects(changePassword(client, 'new-password', 'different'), /do not match/);
  assert.equal(calls, 0);
  await assert.rejects(changePassword(client, 'new-password', 'new-password'), /Password policy/);
  assert.equal(calls, 1);
});
test('native recovery exchanges both tokens before showing the password form', async () => {
  let received;
  const client = { auth: { setSession: async tokens => { received = tokens; return { error: null }; } } };
  assert.equal(await acceptRecoveryLink(client, 'mealventory://reset-password#type=recovery&access_token=a%2Bb&refresh_token=r'), true);
  assert.deepEqual(received, { access_token: 'a+b', refresh_token: 'r' });
  assert.equal(await acceptRecoveryLink(client, 'mealventory://reset-password#type=recovery&access_token=a'), false);
  await assert.rejects(acceptRecoveryLink(client, 'mealventory://reset-password#type=recovery&error=expired'), /invalid or expired/);
});
test('PKCE recovery, unrelated links and expired recovery sessions', async () => {
  const client = { auth: {
    exchangeCodeForSession: async code => { assert.equal(code, 'abc'); return { error: null }; },
    setSession: async () => ({ error: new Error('Expired') }),
  } };
  assert.equal(await acceptRecoveryLink(client, 'exp://localhost/--/reset-password?code=abc'), true);
  assert.equal(await acceptRecoveryLink(client, 'mealventory://unrelated'), false);
  await assert.rejects(acceptRecoveryLink(client, 'exp://localhost/--/reset-password#access_token=a&refresh_token=r'), /Expired/);
});
for (const file of ['app/(app)/_layout.tsx', 'app/(modal)/_layout.tsx']) {
  test(`${file}: signed-out/back navigation is guarded and members can enter`, () => {
    let state = { ready: false };
    const { default: Layout } = load(file, {
      'expo-router': { Redirect: 'redirect', Stack: 'stack' },
      '@/src/context/AuthContext': { useAuth: () => state },
    });
    assert.equal(Layout(), null);
    state = { ready: true, session: null };
    assert.equal(Layout().props.href, '/');
    state = { ready: true, session: { user: { id: 'member' } }, household: null };
    assert.equal(Layout().props.href, '/');
    state.household = { id: 'house', role: 'member' };
    assert.equal(Layout().type, 'stack');
    state.recovery = true;
    assert.equal(Layout().props.href, '/reset-password');
  });
}
