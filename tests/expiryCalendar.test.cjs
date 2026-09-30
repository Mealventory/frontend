const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

const pantrySource = fs.readFileSync('src/lib/pantryExpiry.ts', 'utf8');
const pantryMod = new Module('pantryExpiry');
pantryMod._compile(
  ts.transpileModule(pantrySource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  'pantryExpiry.cjs'
);

const source = fs.readFileSync('src/lib/expiryCalendar.ts', 'utf8');
const mod = new Module('expiryCalendar');
mod.require = (name) => {
  if (name === './pantryExpiry') return pantryMod.exports;
  return require(name);
};
mod._compile(
  ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  'expiryCalendar.cjs'
);

const { expiryTimeline, calendarCells, itemsForDate, shiftMonth } = mod.exports;

const today = '2026-09-30';
const item = (id, date, name = id) => ({
  id,
  name,
  expiryDate: date,
  expDate: date || 'Not set',
  storageZone: 'fridge',
  category: 'Produce',
  quantity: '1 item',
  emoji: '🍎',
});

test('upcoming timeline separates expired, today, tomorrow, this week, later and unknown', () => {
  const groups = expiryTimeline([
    item('expired', '2026-09-29'),
    item('today', '2026-09-30'),
    item('tomorrow', '2026-10-01'),
    item('week', '2026-10-07'),
    item('later', '2026-10-08'),
    item('unknown', null),
  ], today);

  assert.deepEqual(groups.expired.map(i => i.id), ['expired']);
  assert.deepEqual(groups.today.map(i => i.id), ['today']);
  assert.deepEqual(groups.tomorrow.map(i => i.id), ['tomorrow']);
  assert.deepEqual(groups.week.map(i => i.id), ['week']);
  assert.deepEqual(groups.later.map(i => i.id), ['later']);
  assert.deepEqual(groups.unknown.map(i => i.id), ['unknown']);
});

test('calendar builds a Sunday-first month and marks item counts with urgency', () => {
  const cells = calendarCells([
    item('a', '2026-10-01'),
    item('b', '2026-10-01'),
    item('c', '2026-10-06'),
    item('unknown', null),
  ], today, 2026, 10);

  assert.equal(cells.length % 7, 0);
  assert.equal(cells.slice(0, 4).every(cell => cell === null), true);
  const first = cells.find(cell => cell && cell.date === '2026-10-01');
  const sixth = cells.find(cell => cell && cell.date === '2026-10-06');
  assert.equal(first.count, 2);
  assert.equal(first.tone, 'critical');
  assert.equal(sixth.count, 1);
  assert.equal(sixth.tone, 'soon');
});

test('selected calendar date returns only exact dated items sorted by name', () => {
  const result = itemsForDate([
    item('2', '2026-10-03', 'Yogurt'),
    item('1', '2026-10-03', 'Milk'),
    item('3', '2026-10-04', 'Bread'),
    item('4', null, 'Undated'),
  ], '2026-10-03');

  assert.deepEqual(result.map(i => i.name), ['Milk', 'Yogurt']);
  assert.deepEqual(itemsForDate(result, 'not-a-date'), []);
});

test('month navigation crosses year boundaries', () => {
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
});
