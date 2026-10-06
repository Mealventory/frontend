const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

test('scan.tsx and scanner.tsx standardize bottom dock height and mode switcher styles', () => {
  for (const file of ['app/(app)/(tabs)/scan.tsx', 'app/(modal)/scanner.tsx']) {
    const content = fs.readFileSync(file, 'utf8');

    // Standardized min-h-[120px] container for zero vertical shift
    assert.ok(
      content.includes('min-h-[120px] justify-center'),
      `${file} should wrap bottom controls in min-h-[120px] justify-center dock`
    );

    // Standardized max-w-[360px] segmented control width
    assert.ok(
      content.includes('max-w-[360px]'),
      `${file} should standardize mode switcher width to max-w-[360px]`
    );

    // Mode switcher disables interaction and announces disabled state when photo is captured
    assert.ok(
      content.includes('disabled={scanning || Boolean(capturedPhoto)}'),
      `${file} should disable mode switching when photo is captured or scanning`
    );
    assert.ok(
      content.includes('disabled: scanning || Boolean(capturedPhoto)'),
      `${file} should announce disabled state in accessibilityState`
    );

    // Mode switcher dims when locked during captured photo preview
    assert.ok(
      content.includes('capturedPhoto ? "opacity-60" : "opacity-100"'),
      `${file} should visually dim mode switcher during photo review`
    );

    // Confirmation card remains rendered during analysis state rather than unmounting
    assert.ok(
      content.includes('loading={scanning}'),
      `${file} should show loading state on Use Photo button during analysis`
    );
  }
});

function createTestHarness(file) {
  const slots = [];
  let cursor = 0;
  let focused = true;
  let captures = 0;
  let uploads = 0;
  let resolveUpload, rejectUpload;
  const pending = new Promise((resolve, reject) => {
    resolveUpload = resolve;
    rejectUpload = reject;
  });

  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
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
      return { uri: 'file:///captured_photo.jpg' };
    },
  };

  const mocks = {
    react,
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    'react-native': {
      View: 'View',
      Image: 'Image',
      Text: 'Text',
      TouchableOpacity: 'TouchableOpacity',
      ActivityIndicator: 'ActivityIndicator',
      StyleSheet: { absoluteFill: {}, create: x => x },
      Platform: { OS: 'ios' },
    },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { useRouter: () => ({ push: () => {}, back: () => {} }) },
    '@/src/hooks/useScannerActive': { useScannerActive: () => focused },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true }, () => {}] },
    'expo-image-picker': {
      requestMediaLibraryPermissionsAsync: async () => ({ granted: true }),
      launchImageLibraryAsync: async () => {
        // Simulating the native OS background / foreground cycle when opening native picker
        focused = false;
        focused = true;
        return { canceled: false, assets: [{ uri: 'file:///gallery_chosen.jpg' }] };
      },
    },
    'expo-haptics': { impactAsync: async () => {}, ImpactFeedbackStyle: { Medium: 1 } },
    '@/src/components/atoms/BrandLogo': { BrandLogo: 'BrandLogo' },
    '@/src/components/atoms': { Typography: 'Typography', Icon: 'Icon', Button: 'Button' },
    '@/src/components/molecules': { BarcodeScannerFrame: 'BarcodeScannerFrame', CameraOverlayControls: 'CameraOverlayControls' },
    '@/src/context/AuthContext': { useAuth: () => ({ session: { access_token: 'token' }, household: { id: 'home' } }) },
    '@/src/lib/supabase': {},
    '@/src/lib/scanApi': { uploadScanImage: async () => { uploads++; return pending; } },
    '@/src/lib/imageOptimizer': { compressImageForUpload: async uri => uri },
    '@/src/lib/barcodeApi': {},
    '@/src/lib/scanHistory': { recordScanFailure: async () => {} },
    '@/src/lib/e2e': { E2E_PRODUCT_SCAN_ITEMS: [], E2E_BARCODE_SCAN_ITEMS: [] },
  };

  const hookMod = new Module('useScannerCapture');
  hookMod.require = name => { if (!(name in mocks)) throw new Error(name); return mocks[name]; };
  hookMod._compile(
    ts.transpileModule(fs.readFileSync('src/hooks/useScannerCapture.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    'useScannerCapture.cjs'
  );
  mocks['@/src/hooks/useScannerCapture'] = hookMod.exports;

  const mod = new Module(file);
  mod.require = name => { if (!(name in mocks)) throw new Error(name); return mocks[name]; };
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText,
    file
  );

  function walk(node) {
    if (!node) return [];
    if (Array.isArray(node)) return node.flatMap(walk);
    if (typeof node !== 'object') return [];
    return [node, ...walk(node.props?.children)];
  }

  return {
    render() {
      cursor = 0;
      const nodes = walk(mod.exports.default());
      const view = nodes.find(n => n.type === 'CameraView');
      if (view) view.props.ref.current = camera;
      return nodes;
    },
    resolveUpload,
    rejectUpload,
    counts: () => ({ uploads, captures }),
  };
}

const tick = () => new Promise(resolve => setImmediate(resolve));

for (const file of ['app/(app)/(tabs)/scan.tsx', 'app/(modal)/scanner.tsx']) {
  test(`${file}: mode switcher is disabled during photo preview and controls stay mounted during analysis`, async () => {
    const h = createTestHarness(file);

    // Initial viewfinder state
    let nodes = h.render();
    const modeButtons = nodes.filter(n => n.type === 'TouchableOpacity' && n.props?.accessibilityRole === 'radio');
    assert.equal(modeButtons.length, 4);
    assert.equal(modeButtons.every(b => b.props.disabled === false), true);

    // Capture photo
    const controls = nodes.find(n => n.type === 'CameraOverlayControls');
    const capturePromise = controls.props.onScan();
    await tick();

    // Photo review state: mode switcher must be disabled
    nodes = h.render();
    const disabledModeButtons = nodes.filter(n => n.type === 'TouchableOpacity' && n.props?.accessibilityRole === 'radio');
    assert.equal(disabledModeButtons.every(b => b.props.disabled === true), true);
    assert.equal(disabledModeButtons.every(b => b.props.accessibilityState.disabled === true), true);

    // Confirmation card buttons exist
    const usePhotoBtn = nodes.find(n => n.props?.label === 'Use Photo');
    const retakeBtn = nodes.find(n => n.props?.label === 'Retake photo');
    assert.ok(usePhotoBtn, 'Use Photo button should be rendered');
    assert.ok(retakeBtn, 'Retake photo button should be rendered');
    assert.equal(usePhotoBtn.props.loading, false);
    assert.equal(usePhotoBtn.props.disabled, false);

    // Tap Use Photo to begin analysis
    usePhotoBtn.props.onPress();
    await tick();

    // Analysis state: confirmation card MUST stay rendered with loading and disabled, NOT jump back to CameraOverlayControls
    nodes = h.render();
    const analyzingUseBtn = nodes.find(n => n.props?.label === 'Use Photo');
    const analyzingRetakeBtn = nodes.find(n => n.props?.label === 'Retake photo');
    assert.ok(analyzingUseBtn, 'Use Photo button should still be mounted during analysis');
    assert.equal(analyzingUseBtn.props.loading, true, 'Use Photo button should show loading state');
    assert.equal(analyzingUseBtn.props.disabled, true, 'Use Photo button should be disabled during analysis');
    assert.equal(analyzingRetakeBtn.props.disabled, true, 'Retake photo button should be disabled during analysis');
    assert.equal(nodes.some(n => n.type === 'CameraOverlayControls'), false, 'Should not render CameraOverlayControls during photo analysis');

    // Simulate upload failure/rejection to test retake recovery
    h.rejectUpload(new Error('No food detected'));
    await capturePromise;
    await tick();

    nodes = h.render();
    const failedRetakeBtn = nodes.find(n => n.props?.label === 'Retake photo');
    assert.equal(failedRetakeBtn.props.disabled, false);

    // Retake photo: restores camera and re-enables mode switcher
    failedRetakeBtn.props.onPress();
    nodes = h.render();
    const restoredModeButtons = nodes.filter(n => n.type === 'TouchableOpacity' && n.props?.accessibilityRole === 'radio');
    assert.equal(restoredModeButtons.every(b => b.props.disabled === false), true);
    assert.equal(nodes.some(n => n.type === 'CameraOverlayControls'), true);
  });

  test(`${file}: selecting a photo from gallery renders the image and review controls even when OS backgrounded app`, async () => {
    let appFocused = true;
    const h = createTestHarness(file);
    let nodes = h.render();

    const galleryBtn = nodes.find(n => n.props?.accessibilityLabel === 'Choose photo from gallery');
    assert.ok(galleryBtn, 'Gallery button should exist in header');

    // Simulate ImagePicker call with OS backgrounding transition
    const pickPromise = galleryBtn.props.onPress();
    await tick();

    nodes = h.render();
    assert.equal(nodes.find(n => n.type === 'Image')?.props?.source?.uri, 'file:///gallery_chosen.jpg');
    assert.ok(nodes.find(n => n.props?.label === 'Use Photo'), 'Confirmation card Use Photo button should appear');
    assert.ok(nodes.find(n => n.props?.label === 'Retake photo'), 'Confirmation card Retake button should appear');
  });
}
