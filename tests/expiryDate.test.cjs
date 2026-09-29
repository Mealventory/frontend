const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const mod = new Module('expiryDate');
mod._compile(ts.transpileModule(fs.readFileSync('src/lib/expiryDate.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, 'expiryDate.cjs');
const { normalizeExpiryDate: parse } = mod.exports;
test('typed date formats normalize consistently', () => {
  for (const value of ['20270125', '2027/01/25', '2027-01-25', '2027.01.25', ' 2027 1 25 ']) assert.equal(parse(value), '2027-01-25');
  assert.equal(parse('2028/2/29'), '2028-02-29');
  assert.equal(parse(' '), null);
});
test('invalid dates and ambiguous day-first inputs never silently become another date', () => {
  for (const value of ['20270229', '2027/13/01', '2027/04/31', '2027/00/10', '01/02/2027', 'tomorrow', '00000101', '202701', '2027-01-00']) assert.throws(() => parse(value));
});
