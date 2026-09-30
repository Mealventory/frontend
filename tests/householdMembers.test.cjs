const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

const originalFetch = global.fetch;
process.env.EXPO_PUBLIC_BACKEND_URL = 'http://127.0.0.1:8000';

function loadTsModule(filePath, moduleName) {
  const code = fs.readFileSync(filePath, 'utf8');
  const compiled = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const mod = new Module(moduleName);
  mod._compile(compiled, `${moduleName}.cjs`);
  return mod.exports;
}

const householdApi = loadTsModule('src/lib/householdApi.ts', 'householdApi');
const memberProfiles = loadTsModule('src/lib/memberProfiles.ts', 'memberProfiles');

afterEach(() => {
  global.fetch = originalFetch;
  memberProfiles.clearMemberProfileCache();
});

test('getHouseholdMembers calls GET on /{household_id}/members with Bearer token', async () => {
  let calledUrl = '';
  let calledMethod = '';
  let authHeader = '';

  global.fetch = async (url, init) => {
    calledUrl = url;
    calledMethod = init.method;
    authHeader = init.headers.Authorization;
    return new Response(JSON.stringify([
      { household_id: 'hh-1', user_id: 'user-1', role: 'owner' },
      { household_id: 'hh-1', user_id: 'user-2', role: 'member' }
    ]));
  };

  const members = await householdApi.getHouseholdMembers('hh-1', 'test-jwt');
  assert.equal(calledUrl, 'http://127.0.0.1:8000/api/v1/households/hh-1/members');
  assert.equal(calledMethod, 'GET');
  assert.equal(authHeader, 'Bearer test-jwt');
  assert.equal(members.length, 2);
  assert.equal(members[0].role, 'owner');
});

test('updateHouseholdMemberRole calls PATCH with role JSON payload', async () => {
  let calledUrl = '';
  let calledMethod = '';
  let calledBody = null;

  global.fetch = async (url, init) => {
    calledUrl = url;
    calledMethod = init.method;
    calledBody = JSON.parse(init.body);
    return new Response(JSON.stringify({
      household_id: 'hh-1',
      user_id: 'user-2',
      role: 'admin'
    }));
  };

  const result = await householdApi.updateHouseholdMemberRole('hh-1', 'user-2', 'admin', 'test-jwt');
  assert.equal(calledUrl, 'http://127.0.0.1:8000/api/v1/households/hh-1/members/user-2');
  assert.equal(calledMethod, 'PATCH');
  assert.deepEqual(calledBody, { role: 'admin' });
  assert.equal(result.role, 'admin');
});

test('removeHouseholdMember calls DELETE on /{household_id}/members/{user_id}', async () => {
  let calledUrl = '';
  let calledMethod = '';

  global.fetch = async (url, init) => {
    calledUrl = url;
    calledMethod = init.method;
    return new Response(null, { status: 204 });
  };

  await householdApi.removeHouseholdMember('hh-1', 'user-2', 'test-jwt');
  assert.equal(calledUrl, 'http://127.0.0.1:8000/api/v1/households/hh-1/members/user-2');
  assert.equal(calledMethod, 'DELETE');
});

test('updateHouseholdMemberRole raises actionable error on 409 last owner conflict', async () => {
  global.fetch = async () => new Response(JSON.stringify({
    detail: 'The last owner cannot leave or be demoted; appoint another owner first'
  }), { status: 409 });

  await assert.rejects(
    householdApi.updateHouseholdMemberRole('hh-1', 'user-1', 'member', 'test-jwt'),
    /last owner cannot leave or be demoted/
  );
});

test('householdRequest raises actionable error on 403 forbidden permissions', async () => {
  global.fetch = async () => new Response(JSON.stringify({
    detail: 'Only owners can change member roles'
  }), { status: 403 });

  await assert.rejects(
    householdApi.updateHouseholdMemberRole('hh-1', 'user-2', 'admin', 'test-jwt'),
    /Only owners can change member roles/
  );
});

test('getInitials correctly extracts 1 or 2 uppercase letters', () => {
  assert.equal(memberProfiles.getInitials('Pablo Gomez'), 'PG');
  assert.equal(memberProfiles.getInitials('Daniel Bajenov'), 'DB');
  assert.equal(memberProfiles.getInitials('Alice'), 'AL');
  assert.equal(memberProfiles.getInitials('chef_pablo'), 'CP');
  assert.equal(memberProfiles.getInitials(''), 'MB');
  assert.equal(memberProfiles.getInitials(null), 'MB');
});

test('formatRole consistently returns Owner, Admin, or Member', () => {
  assert.equal(memberProfiles.formatRole('owner'), 'Owner');
  assert.equal(memberProfiles.formatRole('admin'), 'Admin');
  assert.equal(memberProfiles.formatRole('member'), 'Member');
  assert.equal(memberProfiles.formatRole(undefined), 'Member');
});

test('resolveMemberProfile identifies current user with real name, initials, and You indicator', () => {
  const member = { household_id: 'hh-1', user_id: 'user-pablo', role: 'owner' };
  const session = {
    user: {
      id: 'user-pablo',
      email: 'pablo@mealventory.app',
      user_metadata: { display_name: 'Pablo Gomez', username: 'pablog' },
      created_at: '2026-01-10T12:00:00Z'
    }
  };

  const profile = memberProfiles.resolveMemberProfile(member, session);
  assert.equal(profile.isCurrentUser, true);
  assert.equal(profile.displayName, 'Pablo Gomez');
  assert.equal(profile.initials, 'PG');
  assert.equal(profile.email, 'pablo@mealventory.app');
  assert.equal(profile.role, 'owner');
  assert.equal(profile.recentActivity, 'Active now');
});

test('resolveMemberProfile uses member profile metadata when present', () => {
  const member = {
    household_id: 'hh-1',
    user_id: 'user-daniel',
    role: 'member',
    display_name: 'Daniel Bajenov',
    email: 'daniel@example.com',
    last_active_at: 'Active 2h ago'
  };

  const profile = memberProfiles.resolveMemberProfile(member, { user: { id: 'other-user' } });
  assert.equal(profile.isCurrentUser, false);
  assert.equal(profile.displayName, 'Daniel Bajenov');
  assert.equal(profile.initials, 'DB');
  assert.equal(profile.email, 'daniel@example.com');
  assert.equal(profile.recentActivity, 'Active 2h ago');
});

test('resolveMemberProfile gracefully falls back when profile data is missing', () => {
  const member = {
    household_id: 'hh-1',
    user_id: '9f8e7d6c-5b4a-3210-fedc-ba9876543210',
    role: 'admin'
  };

  const profile = memberProfiles.resolveMemberProfile(member, null);
  assert.equal(profile.isCurrentUser, false);
  assert.equal(profile.displayName, 'Member 9f8e7d');
  assert.equal(profile.initials, 'M9');
  assert.equal(profile.role, 'admin');
  assert.ok(profile.joinedAt);
  assert.ok(profile.recentActivity);
});

test('resolveMemberList sorts current user first, then by role hierarchy', () => {
  const raw = [
    { household_id: 'hh-1', user_id: 'id-member', role: 'member', display_name: 'Charlie' },
    { household_id: 'hh-1', user_id: 'id-other-owner', role: 'owner', display_name: 'Zara' },
    { household_id: 'hh-1', user_id: 'id-me', role: 'admin', display_name: 'Bob' },
  ];
  const session = { user: { id: 'id-me', user_metadata: { display_name: 'Bob' } } };

  const sorted = memberProfiles.resolveMemberList(raw, session);
  assert.equal(sorted[0].userId, 'id-me');
  assert.equal(sorted[0].isCurrentUser, true);
  assert.equal(sorted[1].userId, 'id-other-owner');
  assert.equal(sorted[2].userId, 'id-member');
});

test('members.tsx does not use RoutePlaceholder and includes dynamic member query', () => {
  const content = fs.readFileSync('app/(app)/household/members.tsx', 'utf8');
  assert.ok(!content.includes('RoutePlaceholder'), 'members.tsx should not contain RoutePlaceholder');
  assert.ok(content.includes('getHouseholdMembers'), 'members.tsx should call getHouseholdMembers');
  assert.ok(content.includes('MemberDetailSheet'), 'members.tsx should include MemberDetailSheet');
  assert.ok(content.includes('updateHouseholdMemberRole'), 'members.tsx should support role updates');
  assert.ok(content.includes('removeHouseholdMember'), 'members.tsx should support member removal');
});

test('MemberDetailSheet.tsx exposes role distinction and owner management entry points', () => {
  const content = fs.readFileSync('src/components/domain/MemberDetailSheet.tsx', 'utf8');
  assert.ok(content.includes('onUpdateRole'), 'MemberDetailSheet should accept onUpdateRole');
  assert.ok(content.includes('onRemoveMember'), 'MemberDetailSheet should accept onRemoveMember');
  assert.ok(content.includes('roleDescriptions'), 'MemberDetailSheet should describe roles');
  assert.ok(content.includes('Leave Household'), 'MemberDetailSheet should allow leaving household');
});
