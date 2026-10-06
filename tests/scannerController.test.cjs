const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function createControllerHarness(initialMode = 'food') {
  const slots = [];
  let cursor = 0;
  let focused = true;
  let uploads = 0;
  let captures = 0;
  let barcodeLookups = [];
  const pushes = [];
  let libraryResult = { canceled: false, assets: [{ uri: 'file:///gallery_picked.jpg' }] };
  let cameraUri = 'file:///camera_captured.jpg';

  let resolveUpload, rejectUpload;
  let pendingUpload = new Promise((resolve, reject) => {
    resolveUpload = resolve;
    rejectUpload = reject;
  });

  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [
        slots[i],
        value => {
          slots[i] = typeof value === 'function' ? value(slots[i]) : value;
        },
      ];
    },
    useRef(value) {
      const i = cursor++;
      return (slots[i] ||= { current: value });
    },
    useCallback: fn => fn,
    useLayoutEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || slots[i].dep !== deps[0]) {
        slots[i]?.cleanup?.();
        slots[i] = { dep: deps[0], cleanup: fn() };
      }
    },
  };

  const camera = {
    takePictureAsync: async () => {
      captures++;
      return { uri: cameraUri };
    },
  };

  const mocks = {
    react,
    'expo-router': {
      useRouter: () => ({
        push: params => pushes.push(params),
      }),
    },
    '@/src/hooks/useScannerActive': {
      useScannerActive: () => focused,
    },
    'expo-camera': {
      CameraView: 'CameraView',
      useCameraPermissions: () => [{ granted: true }, () => {}],
      scanFromURLAsync: async uri => [{ data: '7891011' }],
    },
    'expo-image-picker': {
      requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
      launchImageLibraryAsync: async () => libraryResult,
    },
    'expo-haptics': {
      impactAsync: async () => {},
      notificationAsync: async () => {},
      ImpactFeedbackStyle: { Medium: 1 },
      NotificationFeedbackType: { Success: 1 },
    },
    '@/src/context/AuthContext': {
      useAuth: () => ({
        session: { access_token: 'auth-test-token' },
        household: { id: 'hh-123', name: 'Main Pantry' },
      }),
    },
    '@/src/lib/supabase': {
      supabase: {
        auth: {
          getSession: async () => ({
            data: { session: { access_token: 'auth-test-token' } },
          }),
        },
      },
    },
    '@/src/lib/scanApi': {
      uploadScanImage: async ({ mode, imageUri, token, householdId }) => {
        uploads++;
        return pendingUpload;
      },
    },
    '@/src/lib/imageOptimizer': {
      compressImageForUpload: async (uri, opts) => `compressed_${uri}`,
    },
    '@/src/lib/barcodeApi': {
      fetchProductByBarcode: async code => {
        barcodeLookups.push(code);
        if (code === 'FAIL') throw new Error('Product not found');
        return {
          name: `Product ${code}`,
          category: 'Produce',
          quantity: 1,
          unit: 'units',
          expiry_date: null,
          storageZone: 'fridge',
          confidence: 0.95,
        };
      },
    },
    '@/src/lib/scanHistory': {
      recordScanFailure: async () => {},
    },
  };

  const hookMod = new Module('useScannerCapture');
  hookMod.require = name => {
    if (!(name in mocks)) throw new Error(`Missing mock: ${name}`);
    return mocks[name];
  };
  hookMod._compile(
    ts.transpileModule(fs.readFileSync('src/hooks/useScannerCapture.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    'useScannerCapture.cjs'
  );

  return {
    exec(options) {
      cursor = 0;
      const controller = hookMod.exports.useScannerCapture(options || { initialMode });
      if (controller.cameraRef) {
        controller.cameraRef.current = camera;
      }
      return controller;
    },
    focus(val) {
      focused = val;
    },
    pushes,
    counts: () => ({ uploads, captures, barcodeLookups }),
    resolveUpload: val => resolveUpload(val),
    rejectUpload: err => rejectUpload(err),
    resetPending: () => {
      pendingUpload = new Promise((resolve, reject) => {
        resolveUpload = resolve;
        rejectUpload = reject;
      });
    },
    setLibraryResult: res => {
      libraryResult = res;
    },
    constants: {
      SCANNER_MODES: hookMod.exports.SCANNER_MODES,
      BARCODE_TYPES: hookMod.exports.BARCODE_TYPES,
      MODES: hookMod.exports.MODES,
    },
  };
}

const tick = () => new Promise(resolve => setImmediate(resolve));

test('useScannerCapture exposes shared modes, barcode types, and default food mode', () => {
  const h = createControllerHarness();
  const c = h.exec();

  assert.equal(c.mode, 'food');
  assert.equal(c.scanning, false);
  assert.equal(c.capturedPhoto, null);
  assert.equal(c.flashOn, false);
  assert.equal(c.errorMessage, null);
  assert.equal(c.activeModeConfig.id, 'food');
  assert.equal(c.activeModeConfig.label, 'Item');

  const modeIds = h.constants.SCANNER_MODES.map(m => m.id);
  assert.deepEqual(modeIds, ['food', 'tag', 'receipt', 'barcode']);

  const modeLabels = h.constants.SCANNER_MODES.map(m => m.label);
  assert.deepEqual(modeLabels, ['Item', 'Tag', 'Receipt', 'Barcode']);
  for (const m of h.constants.SCANNER_MODES) {
    assert.equal(m.label[0], m.label[0].toUpperCase(), `Mode label ${m.label} must start with uppercase`);
  }
  assert.ok(h.constants.BARCODE_TYPES.includes('ean13'));
  assert.ok(h.constants.BARCODE_TYPES.includes('upc_a'));
});

test('useScannerCapture: selectMode changes mode, clears errors, and resets captured photo', () => {
  const h = createControllerHarness();
  let c = h.exec();

  c.selectMode('tag');
  c = h.exec();
  assert.equal(c.mode, 'tag');
  assert.equal(c.activeModeConfig.id, 'tag');
  assert.equal(c.capturedPhoto, null);

  c.selectMode('receipt');
  c = h.exec();
  assert.equal(c.mode, 'receipt');

  c.selectMode('barcode');
  c = h.exec();
  assert.equal(c.mode, 'barcode');
});

test('useScannerCapture: Barcode mode performs live auto-scan, debounces rapid events, and navigates to review', async () => {
  const h = createControllerHarness();
  let c = h.exec();
  c.selectMode('barcode');
  c = h.exec();

  // Rapid barcode scanned callbacks
  const scanPromise1 = c.handleBarcodeScanned({ data: '0123456789' });
  const scanPromise2 = c.handleBarcodeScanned({ data: '0123456789' });
  await Promise.all([scanPromise1, scanPromise2]);
  await tick();

  assert.equal(h.pushes.length, 1);
  assert.equal(h.pushes[0].pathname, '/(modal)/ai-review');
  assert.equal(h.pushes[0].params.barcode, '0123456789');
  assert.deepEqual(h.counts().barcodeLookups, ['0123456789']);

  // Fallback on barcode lookup failure after returning from review
  h.pushes.length = 0;
  h.focus(false);
  c = h.exec();
  h.focus(true);
  c = h.exec();

  await c.handleBarcodeScanned({ data: 'FAIL' });
  await tick();

  assert.equal(h.pushes.length, 1);
  assert.equal(h.pushes[0].pathname, '/(modal)/ai-review');
  const items = JSON.parse(h.pushes[0].params.items);
  assert.equal(items[0].name, 'Item (FAIL)');
  assert.equal(items[0].category, 'Pantry');
});

test('useScannerCapture: handleScan captures and visibly freezes photo for food/tag/receipt modes', async () => {
  const h = createControllerHarness();
  let c = h.exec();

  // Shutter tap captures image
  const running = c.handleScan();
  // Duplicate rapid tap should be ignored by captureLock
  await c.handleScan();
  await running;
  await tick();

  c = h.exec();
  assert.equal(c.capturedPhoto, 'file:///camera_captured.jpg');
  assert.equal(c.scanning, false);
  assert.equal(h.counts().captures, 1);
  assert.equal(h.counts().uploads, 0);

  // Retake photo restores live camera state
  c.retakePhoto();
  c = h.exec();
  assert.equal(c.capturedPhoto, null);
  assert.equal(c.errorMessage, null);
});

test('useScannerCapture: processScannedImage uploads photo and navigates to review', async () => {
  const h = createControllerHarness();
  let c = h.exec();

  await c.handleScan();
  c = h.exec();
  assert.equal(c.capturedPhoto, 'file:///camera_captured.jpg');

  const uploadPromise = c.processScannedImage(c.capturedPhoto);
  await tick();
  c = h.exec();
  assert.equal(c.scanning, true);
  assert.equal(h.counts().uploads, 1);

  h.resolveUpload([{ name: 'Apples', quantity: 3, category: 'Produce' }]);
  await uploadPromise;
  await tick();

  assert.equal(h.pushes.length, 1);
  assert.equal(h.pushes[0].pathname, '/(modal)/ai-review');
  const items = JSON.parse(h.pushes[0].params.items);
  assert.equal(items[0].name, 'Apples');
});

test('useScannerCapture: blur / unfocus cancels in-flight review navigation', async () => {
  const h = createControllerHarness();
  let c = h.exec();

  await c.handleScan();
  c = h.exec();

  const uploadPromise = c.processScannedImage(c.capturedPhoto);
  await tick();

  // Screen loses focus while upload is in-flight (e.g., navigated away or app backgrounded)
  h.focus(false);
  c = h.exec();
  h.focus(true);
  c = h.exec();

  h.resolveUpload([{ name: 'Milk' }]);
  await uploadPromise;
  await tick();

  // Push was cancelled because scanGeneration changed during blur
  assert.equal(h.pushes.length, 0);
});

test('useScannerCapture: handlePickImage picks from library and triggers scan flow', async () => {
  const h = createControllerHarness();
  let c = h.exec();

  await c.handlePickImage();
  c = h.exec();
  assert.equal(c.capturedPhoto, 'file:///gallery_picked.jpg');

  // Switch to barcode mode and pick
  c.selectMode('barcode');
  c = h.exec();
  await c.handlePickImage();
  await tick();

  assert.equal(h.pushes.length, 1);
  assert.equal(h.pushes[0].params.barcode, '7891011');
});

test('both scan.tsx and scanner.tsx entry points consume shared useScannerCapture', () => {
  const scanContent = fs.readFileSync('app/(app)/(tabs)/scan.tsx', 'utf8');
  const modalContent = fs.readFileSync('app/(modal)/scanner.tsx', 'utf8');

  // Both consume useScannerCapture hook
  assert.ok(scanContent.includes('useScannerCapture()'), 'scan.tsx must consume useScannerCapture');
  assert.ok(modalContent.includes('useScannerCapture()'), 'scanner.tsx must consume useScannerCapture');

  // Neither duplicates large capture / upload handlers
  assert.ok(!scanContent.includes('fetchProductByBarcode'), 'scan.tsx should not directly define fetchProductByBarcode');
  assert.ok(!modalContent.includes('fetchProductByBarcode'), 'scanner.tsx should not directly define fetchProductByBarcode');
  assert.ok(!scanContent.includes('compressImageForUpload'), 'scan.tsx should not directly import compressImageForUpload');
  assert.ok(!modalContent.includes('compressImageForUpload'), 'scanner.tsx should not directly import compressImageForUpload');

  // Specific header differences are maintained
  // Tab screen has manual add plus button on the right
  assert.ok(scanContent.includes('router.push("/(modal)/manual-add"'), 'scan.tsx has manual add plus button');
  // Modal screen has cancel/close button on the left
  assert.ok(modalContent.includes('router.back()'), 'scanner.tsx modal has close/back button');
});
