const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('scan.tsx has gallery picker button to the left of AI Scanner title', () => {
  const scanContent = fs.readFileSync('app/(app)/(tabs)/scan.tsx', 'utf8');
  const controllerContent = fs.readFileSync('src/hooks/useScannerCapture.ts', 'utf8');

  // Verify ImagePicker and scanFromURLAsync in shared scanner architecture
  assert.ok(
    controllerContent.includes('expo-image-picker') || scanContent.includes('expo-image-picker'),
    'shared scanner architecture should import expo-image-picker'
  );
  assert.ok(
    controllerContent.includes('scanFromURLAsync') || scanContent.includes('scanFromURLAsync'),
    'shared scanner architecture should import scanFromURLAsync'
  );

  // Verify Image icon button in the header
  assert.ok(scanContent.includes('handlePickImage'), 'scan.tsx should define handlePickImage');
  assert.ok(scanContent.includes('<Icon name="Image"'), 'scan.tsx should render an Image icon button');

  // Verify header ordering: Gallery button comes before AI Scanner title
  const galleryBtnIndex = scanContent.indexOf('onPress={handlePickImage}');
  const titleIndex = scanContent.indexOf('AI Scanner');
  assert.ok(galleryBtnIndex !== -1, 'handlePickImage should be bound to a button');
  assert.ok(titleIndex !== -1, 'AI Scanner title should exist');
  assert.ok(galleryBtnIndex < titleIndex, 'Gallery button should be to the left of AI Scanner title');
});

test('scanner.tsx modal has gallery picker button with matching capabilities', () => {
  const modalContent = fs.readFileSync('app/(modal)/scanner.tsx', 'utf8');
  const controllerContent = fs.readFileSync('src/hooks/useScannerCapture.ts', 'utf8');

  assert.ok(
    controllerContent.includes('expo-image-picker') || modalContent.includes('expo-image-picker'),
    'shared scanner architecture should import expo-image-picker'
  );
  assert.ok(
    controllerContent.includes('scanFromURLAsync') || modalContent.includes('scanFromURLAsync'),
    'shared scanner architecture should import scanFromURLAsync'
  );
  assert.ok(modalContent.includes('handlePickImage'), 'scanner.tsx should define handlePickImage');
  assert.ok(modalContent.includes('<Icon name="Image"'), 'scanner.tsx should render an Image icon button');
});

test('mode-aware scanning logic in scan.tsx correctly handles food, receipt, and barcode modes', () => {
  const controllerContent = fs.existsSync('src/hooks/useScannerCapture.ts')
    ? fs.readFileSync('src/hooks/useScannerCapture.ts', 'utf8')
    : fs.readFileSync('app/(app)/(tabs)/scan.tsx', 'utf8');

  // Barcode mode extracts barcode from URI
  assert.ok(controllerContent.includes('mode === "barcode"'), 'shared controller should have barcode mode branch');
  assert.ok(controllerContent.includes('fetchProductByBarcode'), 'shared controller should fetch product by barcode');
  assert.ok(controllerContent.includes('scanFromURLAsync(rawUri'), 'shared controller should scan barcode from image URI');

  // Food and receipt mode compress and upload
  assert.ok(controllerContent.includes('compressImageForUpload(rawUri'), 'shared controller should compress image before upload');
  assert.ok(controllerContent.includes('uploadScanImage({'), 'shared controller should upload scan image with active mode');

  // Friendly error message fallback
  assert.ok(
    controllerContent.includes('could not be detected. Please adjust camera framing and retry.'),
    'shared controller should show friendly detection failure message'
  );
});

test('CameraOverlayControls maintains identical h-12 rounded-2xl sizing across flash, barcode, product, and receipt buttons', () => {
  const overlayContent = fs.readFileSync('src/components/molecules/CameraOverlayControls.tsx', 'utf8');

  // Flash button size
  assert.ok(overlayContent.includes('w-12 h-12 rounded-2xl'), 'Flash button should be w-12 h-12 rounded-2xl');

  // Barcode button size
  assert.ok(overlayContent.includes('h-12 bg-white/15 border border-white/25 rounded-2xl'), 'Barcode button should be h-12 rounded-2xl');

  // Product and receipt scan button size
  assert.ok(overlayContent.includes('h-12 bg-brand-500 active:bg-brand-600 border border-brand-500 rounded-2xl'), 'Product/receipt scan button should match h-12 rounded-2xl');
});

