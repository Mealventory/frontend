const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

const zones = new Module('storageZones');
zones._compile(ts.transpileModule(fs.readFileSync('src/lib/storageZones.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, 'storageZones.cjs');

const mod = new Module('scanApi');
const originalRequire = mod.require.bind(mod);
mod.require = name => name === './storageZones' ? zones.exports : originalRequire(name);
mod._compile(
  ts.transpileModule(fs.readFileSync('src/lib/scanApi.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  'scanApi.cjs'
);

const { formatExpiryDate, normalizeScanResponse } = mod.exports;

test('formatExpiryDate correctly parses Canadian bilingual date formats', () => {
  assert.equal(formatExpiryDate('2027 JA 25'), '2027-01-25');
  assert.equal(formatExpiryDate('27 JA 25'), '2027-01-25');
  assert.equal(formatExpiryDate('2027-JA-25'), '2027-01-25');
  assert.equal(formatExpiryDate('2027 FE 14'), '2027-02-14');
  assert.equal(formatExpiryDate('2027 MR 03'), '2027-03-03');
  assert.equal(formatExpiryDate('2027 AL 19'), '2027-04-19');
  assert.equal(formatExpiryDate('2027 MA 05'), '2027-05-05');
  assert.equal(formatExpiryDate('2027 JN 30'), '2027-06-30');
  assert.equal(formatExpiryDate('2027 JL 04'), '2027-07-04');
  assert.equal(formatExpiryDate('2027 AU 15'), '2027-08-15');
  assert.equal(formatExpiryDate('2027 SE 22'), '2027-09-22');
  assert.equal(formatExpiryDate('2027 OC 31'), '2027-10-31');
  assert.equal(formatExpiryDate('2027 NO 11'), '2027-11-11');
  assert.equal(formatExpiryDate('2027 DE 25'), '2027-12-25');
});

test('formatExpiryDate parses standard ISO and named months', () => {
  assert.equal(formatExpiryDate('2027-01-25'), '2027-01-25');
  assert.equal(formatExpiryDate('2027-01-25T00:00:00Z'), '2027-01-25');
  assert.equal(formatExpiryDate('September 30, 2026'), '2026-09-30');
  assert.equal(formatExpiryDate(''), null);
  assert.equal(formatExpiryDate(null), null);
  assert.equal(formatExpiryDate(undefined), null);
});

test('normalizeScanResponse propagates tag detected expiry date to scanned items', () => {
  const tagDetectionResult = {
    type: 'tag',
    requested_type: 'tag',
    confidence: 0.79,
    items: ['protein'],
    text_preview: 'BEST BEFORE MEILLEUR AVANT 2027 JA 25 FF 11:57 NEC LES PROTEINE',
    expiry_dates: ['2027 JA 25'],
  };

  const normalized = normalizeScanResponse(tagDetectionResult);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].name, 'Core Power Protein');
  assert.equal(normalized[0].category, 'Beverage');
  assert.equal(normalized[0].storageZone, 'fridge');
  assert.equal(normalized[0].expiry_date, '2027-01-25');
  assert.equal(normalized[0].quantity, 1);
});

test('normalizeScanResponse generates fallback Tagged Item when items is empty but expiry date is found', () => {
  const tagWithOnlyDate = {
    type: 'tag',
    requested_type: 'tag',
    confidence: 0.78,
    items: [],
    expiry_dates: ['2027 JA 25'],
  };

  const normalized = normalizeScanResponse(tagWithOnlyDate);
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].name, 'Tagged Item');
  assert.equal(normalized[0].expiry_date, '2027-01-25');
  assert.equal(normalized[0].storageZone, 'pantry');
});

test('scan.tsx and scanner.tsx include Tag mode in MODES array', () => {
  const scanContent = fs.readFileSync('app/(app)/(tabs)/scan.tsx', 'utf8');
  assert.ok(scanContent.includes('{ id: "tag", label: "Tag", icon: "Tag"'), 'scan.tsx must define Tag mode');

  const modalContent = fs.readFileSync('app/(modal)/scanner.tsx', 'utf8');
  assert.ok(modalContent.includes('{ id: "tag", label: "Tag", icon: "Tag"'), 'scanner.tsx must define Tag mode');
});
