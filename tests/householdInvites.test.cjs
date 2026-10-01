const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

const source = fs.readFileSync('src/lib/householdInvites.ts', 'utf8');
const mod = new Module('householdInvites');
mod._compile(
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  'householdInvites.cjs'
);

const {
  normalizeInviteCode,
  isValidInviteCode,
  householdInviteLink,
  householdInviteShareText,
} = mod.exports;

test('invite codes normalize to the six-character backend format', () => {
  assert.equal(normalizeInviteCode(' ab-c 12!3zz '), 'ABC123');
  assert.equal(normalizeInviteCode('meal99'), 'MEAL99');
  assert.equal(isValidInviteCode('meal99'), true);
  assert.equal(isValidInviteCode('short'), false);
});

test('QR payload opens the household join route with the normalized code', () => {
  assert.equal(
    householdInviteLink('ab12cd'),
    'mealventory://join-household?code=AB12CD'
  );
  assert.throws(() => householdInviteLink('bad'), /6 letters or numbers/);
});

test('shared invite includes household name, code and deep link', () => {
  const message = householdInviteShareText('Roommates', 'abc123');
  assert.match(message, /Roommates/);
  assert.match(message, /ABC123/);
  assert.match(message, /mealventory:\/\/join-household\?code=ABC123/);
});
