const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');

let mockManipulate = async (uri, actions, saveOptions) => {
  return { uri: `${uri}-compressed.jpg`, width: 1600, height: 1200 };
};

const mod = new Module('imageOptimizer');
const originalRequire = mod.require.bind(mod);
mod.require = (name) => {
  if (name === 'expo-image-manipulator') {
    return {
      manipulateAsync: (...args) => mockManipulate(...args),
      SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
    };
  }
  return originalRequire(name);
};
mod._compile(
  ts.transpileModule(fs.readFileSync('src/lib/imageOptimizer.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  'imageOptimizer.cjs'
);

const { compressImageForUpload } = mod.exports;

test('compressImageForUpload invokes manipulateAsync with resize and JPEG options', async () => {
  let capturedActions = null;
  let capturedOptions = null;

  mockManipulate = async (uri, actions, saveOptions) => {
    capturedActions = actions;
    capturedOptions = saveOptions;
    return { uri: 'file:///tmp/optimized.jpg' };
  };

  const result = await compressImageForUpload('file:///tmp/original.jpg', {
    maxWidth: 1600,
    quality: 0.8,
  });

  assert.equal(result, 'file:///tmp/optimized.jpg');
  assert.deepEqual(capturedActions, [{ resize: { width: 1600 } }]);
  assert.equal(capturedOptions.compress, 0.8);
  assert.equal(capturedOptions.format, 'jpeg');
});

test('compressImageForUpload falls back gracefully to original URI if manipulation fails', async () => {
  mockManipulate = async () => {
    throw new Error('Platform not supported in current environment');
  };

  const result = await compressImageForUpload('file:///tmp/sample.jpg');
  assert.equal(result, 'file:///tmp/sample.jpg');
});
