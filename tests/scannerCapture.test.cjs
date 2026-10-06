const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

function harness(file) {
  const slots = []; let cursor = 0, focused = true, uploads = 0, captures = 0;
  let resolveUpload, rejectUpload; const pushes = [];
  const pending = new Promise((resolve, reject) => { resolveUpload = resolve; rejectUpload = reject; });
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; },
    useCallback: fn => fn,
    useLayoutEffect(fn, deps) { const i = cursor++; if (!slots[i] || slots[i].dep !== deps[0]) { slots[i]?.cleanup?.(); slots[i] = { dep: deps[0], cleanup: fn() }; } },
  };
  const camera = { takePictureAsync: async () => { captures++; return { uri: 'file:///captured.jpg' }; } };
  const mocks = {
    react,
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': { View: 'View', Image: 'Image', Text: 'Text', TouchableOpacity: 'Touch', ActivityIndicator: 'Spinner', StyleSheet: { absoluteFill: {}, create: x => x }, Platform: { OS: 'ios' } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeArea' },
    'expo-router': { useRouter: () => ({ push: value => pushes.push(value) }) },
    '@/src/hooks/useScannerActive': { useScannerActive: () => focused },
    'expo-camera': { CameraView: 'Camera', useCameraPermissions: () => [{ granted: true }, () => {}] },
    'expo-image-picker': {},
    'expo-haptics': { impactAsync: async () => {}, ImpactFeedbackStyle: { Medium: 1 } },
    '@/src/components/atoms/BrandLogo': { BrandLogo: 'BrandLogo' },
    '@/src/components/atoms': { Typography: 'Typography', Icon: 'Icon', Button: 'Button' },
    '@/src/components/molecules': { BarcodeScannerFrame: 'Frame', CameraOverlayControls: 'Controls' },
    '@/src/context/AuthContext': { useAuth: () => ({ session: { access_token: 'token' }, household: { id: 'home' } }) },
    '@/src/lib/supabase': {},
    '@/src/lib/scanApi': { uploadScanImage: async ({ imageUri }) => { assert.equal(imageUri, 'file:///captured.jpg'); uploads++; return pending; } },
    '@/src/lib/imageOptimizer': { compressImageForUpload: async uri => uri },
    '@/src/lib/barcodeApi': {},
    '@/src/lib/scanHistory': { recordScanFailure: async () => {} },
    '@/src/lib/e2e': {
      E2E_PRODUCT_SCAN_ITEMS: [],
      E2E_BARCODE_SCAN_ITEMS: [],
    },
  };
  const hookMod = new Module('useScannerCapture');
  hookMod.require = name => { if (!(name in mocks)) throw new Error(name); return mocks[name]; };
  hookMod._compile(ts.transpileModule(fs.readFileSync('src/hooks/useScannerCapture.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, 'useScannerCapture.cjs');
  mocks['@/src/hooks/useScannerCapture'] = hookMod.exports;
  const mod = new Module(file);
  mod.require = name => { if (!(name in mocks)) throw new Error(name); return mocks[name]; };
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, file);
  function walk(node) { if (!node) return []; if (Array.isArray(node)) return node.flatMap(walk); if (typeof node !== 'object') return []; return [node, ...walk(node.props?.children)]; }
  return {
    render() { cursor = 0; const nodes = walk(mod.exports.default()); const view = nodes.find(n => n.type === 'Camera'); if (view) view.props.ref.current = camera; return nodes; },
    focus(value) { focused = value; }, resolveUpload, rejectUpload, pushes,
    counts: () => ({ uploads, captures }),
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
for (const file of ['app/(app)/(tabs)/scan.tsx', 'app/(modal)/scanner.tsx']) {
  test(`${file}: capture freezes photo, rejects duplicate taps, and retake restores camera`, async () => {
    const h = harness(file);
    const capture = h.render().find(n => n.type === 'Controls').props.onScan;
    const running = capture(); await capture(); await tick();
    const frozen = h.render();
    assert.equal(frozen.some(n => n.type === 'Camera'), false);
    assert.equal(frozen.find(n => n.type === 'Image').props.source.uri, 'file:///captured.jpg');
    assert.deepEqual(h.counts(), { captures: 1, uploads: 0 });
    const usePhoto = frozen.find(n => n.props?.label === "Use Photo").props.onPress;
    usePhoto(); usePhoto(); await tick();
    assert.deepEqual(h.counts(), { captures: 1, uploads: 1 });
    h.rejectUpload(new Error('No food detected')); await running; await tick();
    h.render().find(n => n.props?.label === 'Retake photo').props.onPress();
    assert.equal(h.render().some(n => n.type === 'Camera'), true);
  });
  test(`${file}: retake discards an unsubmitted photo`, async () => {
    const h = harness(file);
    await h.render().find(n => n.type === 'Controls').props.onScan();
    h.render().find(n => n.props?.label === 'Retake photo').props.onPress();
    assert.equal(h.render().some(n => n.type === 'Camera'), true);
    assert.equal(h.counts().uploads, 0);
  });
  test(`${file}: leaving during analysis prevents stale results from opening review`, async () => {
    const h = harness(file); const running = h.render().find(n => n.type === 'Controls').props.onScan();
    await tick(); h.render().find(n => n.props?.label === "Use Photo").props.onPress(); await tick(); h.focus(false); h.render(); h.focus(true); h.render();
    h.resolveUpload([{ name: 'apple' }]); await running; await tick();
    assert.equal(h.pushes.length, 0);
    assert.equal(h.render().some(n => n.type === 'Image'), false);
  });
}
