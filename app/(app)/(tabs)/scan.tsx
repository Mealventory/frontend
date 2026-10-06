import React from "react";
import {
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView } from "expo-camera";
import { Typography, Icon, Button } from "@/src/components/atoms";
import { BrandLogo } from "@/src/components/atoms/BrandLogo";
import { BarcodeScannerFrame, CameraOverlayControls } from "@/src/components/molecules";
import { useAuth } from "@/src/context/AuthContext";
import {
  useScannerCapture,
  SCANNER_MODES,
  BARCODE_TYPES,
  SCANNER_MODES as MODES,
} from "@/src/hooks/useScannerCapture";
import {
  E2E_BARCODE_SCAN_ITEMS,
  E2E_PRODUCT_SCAN_ITEMS,
} from "@/src/lib/e2e";

// Supported modes configuration:
// - Product: id: "food"
// - Tag: id: "tag"
// - Receipt: id: "receipt"
// - Barcode: id: "barcode"

export default function ScanTabScreen() {
  const router = useRouter();
  const { session, household, e2eMode } = useAuth();

  const {
    mode,
    scanning,
    capturedPhoto,
    flashOn,
    errorMessage,
    setErrorMessage,
    cameraRef,
    permission,
    requestPermission,
    handleBarcodeScanned,
    handleScan,
    handlePickImage,
    processScannedImage,
    retakePhoto,
    selectMode,
    toggleFlash,
    activeModeConfig,
    modes,
    barcodeTypes,
    isFocused,
  } = useScannerCapture();

  if (e2eMode) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas px-5 py-6">
        <View className="flex-1 justify-center gap-4">
          <Typography variant="h2" className="text-center">
            Scanner E2E Fixtures
          </Typography>
          <Typography variant="body" color="muted" className="text-center mb-3">
            Deterministic review flows for automated mobile smoke tests.
          </Typography>
          <Button
            testID="e2e-product-review"
            label="Open Product Review Fixture"
            onPress={() =>
              router.push({
                pathname: "/(modal)/ai-review",
                params: {
                  items: JSON.stringify(E2E_PRODUCT_SCAN_ITEMS),
                  mode: "food",
                },
              } as any)
            }
          />
          <Button
            testID="e2e-barcode-review"
            label="Open Barcode Fallback Fixture"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/(modal)/ai-review",
                params: {
                  items: JSON.stringify(E2E_BARCODE_SCAN_ITEMS),
                  mode: "barcode",
                  barcode: "012345678905",
                },
              } as any)
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  // Permission: loading state
  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas items-center justify-center p-6">
        <ActivityIndicator size="large" color="#10B981" />
        <Typography variant="body" color="muted" className="mt-4 text-center">
          Initializing Camera...
        </Typography>
      </SafeAreaView>
    );
  }

  // Permission: denied state
  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas justify-between p-6">
        <View className="items-center pt-8">
          <BrandLogo width={140} />
          <View className="w-20 h-20 rounded-3xl bg-brand-50 items-center justify-center mb-6 mt-4 border border-brand-200">
            <Icon name="Camera" size={36} color="#10B981" />
          </View>
          <Typography variant="h2" className="text-center mb-2 font-bold">
            Camera Access Needed
          </Typography>
          <Typography variant="body" color="muted" className="text-center px-4 mb-8">
            Mealventory needs camera access to scan barcodes for instant product lookup, read receipts, and detect produce with AI Vision.
          </Typography>
          <Button
            label="Grant Camera Permission"
            variant="primary"
            size="lg"
            onPress={requestPermission}
            className="w-full mb-3"
            leadingIcon={<Icon name="Camera" size={20} color="#FFFFFF" />}
          />
          <Button
            label="Choose Photo from Gallery"
            variant="outline"
            size="lg"
            className="w-full mb-3"
            onPress={handlePickImage}
            leadingIcon={<Icon name="Image" size={20} color="#FFFFFF" />}
          />
          <Button
            label="Add Items Manually"
            variant="ghost"
            size="lg"
            className="w-full"
            onPress={() => router.push("/(modal)/manual-add" as any)}
          />
        </View>

        <View className="mb-4" />
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* High-Performance 60fps Native Viewfinder (Persistent across mode switches) */}
      {isFocused && !capturedPhoto && (
        <CameraView
          ref={cameraRef}
          facing="back"
          enableTorch={flashOn}
          barcodeScannerSettings={{
            barcodeTypes: barcodeTypes as any,
          }}
          onBarcodeScanned={mode === "barcode" ? handleBarcodeScanned : undefined}
          style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
          onMountError={(e) =>
            setErrorMessage(e?.message || "Failed to initialize camera")
          }
        />
      )}

      {capturedPhoto && (
        <Image
          source={{ uri: capturedPhoto }}
          resizeMode="cover"
          accessibilityLabel="Captured photo being analyzed"
          style={StyleSheet.absoluteFill}
        />
      )}

      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 justify-between">
        {/* Top Header */}
        <View className="flex-row items-center justify-between px-5 pt-3">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: scanning, busy: scanning }}
            activeOpacity={0.7}
            disabled={scanning}
            onPress={handlePickImage}
            accessibilityLabel="Choose photo from gallery"
            className="w-11 h-11 rounded-2xl bg-black/50 items-center justify-center border border-white/20"
          >
            <Icon name="Image" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="items-center">
            <BrandLogo width={112} />
            <Typography variant="h3" className="text-white font-bold">
              AI Scanner
            </Typography>
            <View className="flex-row items-center">
              <Typography variant="caption" className="text-white/70">
                {household?.name || "Kitchen"}
              </Typography>
              <TouchableOpacity
                onPress={() => router.push("/(app)/scan-history" as any)}
                accessibilityRole="button"
                accessibilityLabel="Open recent scans"
                className="ml-2 flex-row items-center rounded-full bg-black/50 border border-white/20 px-2 py-1"
              >
                <Icon name="History" size={11} color="#FFFFFF" />
                <Text className="text-white/80 text-[10px] font-semibold ml-1">
                  Recent
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add item manually"
            accessibilityState={{ disabled: scanning }}
            activeOpacity={0.7}
            disabled={scanning}
            onPress={() => router.push("/(modal)/manual-add" as any)}
            className="w-11 h-11 rounded-2xl bg-black/50 items-center justify-center border border-white/20"
          >
            <Icon name="Plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Reticle Viewfinder & Mode Framing Guide */}
        <View className="items-center justify-center my-auto">
          <BarcodeScannerFrame
            mode={mode}
            scanning={scanning}
            instructionText={activeModeConfig.instruction}
          />
        </View>

        {/* Bottom Section: Error Toast + Mode Switcher + Shutter Controls */}
        <View className="px-5 pb-4">
          {/* Error Notice Banner */}
          {errorMessage && (
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              className="mb-4 p-3.5 rounded-2xl bg-danger-500/95 border border-danger-400 flex-row items-center justify-between shadow-lg"
            >
              <View className="flex-row items-center flex-1 mr-2">
                <Icon name="AlertCircle" size={18} color="#FFFFFF" />
                <Text className="text-white text-[13px] font-medium ml-2 flex-1">
                  {errorMessage}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Dismiss scan error"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                onPress={() => setErrorMessage(null)}
                className="p-1"
              >
                <Icon name="X" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Mode Switcher Segmented Control */}
          <View className="w-full max-w-[360px] self-center flex-row items-center justify-between mb-4 bg-black/60 p-1 rounded-full border border-white/20">
            {modes.map((m) => {
              const isSelected = mode === m.id;
              const displayLabel = m.label
                ? m.label.charAt(0).toUpperCase() + m.label.slice(1)
                : m.id.charAt(0).toUpperCase() + m.id.slice(1);
              return (
                <TouchableOpacity
                  key={`${m.id}-${m.label}`}
                  accessibilityRole="radio"
                  accessibilityLabel={`${m.label} scan mode`}
                  accessibilityState={{ checked: isSelected, disabled: scanning }}
                  activeOpacity={0.75}
                  disabled={scanning}
                  onPress={() => selectMode(m.id)}
                  className={`flex-1 min-h-[44px] flex-row items-center justify-center py-2 px-2 rounded-full ${
                    isSelected ? "bg-brand-500" : "bg-transparent"
                  }`}
                >
                  <Icon
                    name={m.icon}
                    size={14}
                    color={isSelected ? "#FFFFFF" : "#94A3B8"}
                  />
                  <Text
                    numberOfLines={1}
                    className={`ml-1 text-[12px] font-semibold ${
                      isSelected ? "text-white" : "text-white/70"
                    }`}
                  >
                    {displayLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bottom Overlay Controls */}
          {capturedPhoto && !scanning ? (
            <View className="gap-3 p-3 rounded-3xl bg-black/70 border border-white/20">
              <Typography className="text-white text-center text-sm font-medium px-2">
                Ready to scan? Check that your photo is clear.
              </Typography>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Button
                    label="Retake photo"
                    variant="secondary"
                    className="min-h-[52px] rounded-2xl px-3"
                    onPress={retakePhoto}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Use Photo"
                    className="min-h-[52px] rounded-2xl px-3"
                    onPress={() => void processScannedImage(capturedPhoto)}
                  />
                </View>
              </View>
            </View>
          ) : (
            <CameraOverlayControls
              mode={mode}
              onScan={handleScan}
              scanning={scanning}
              flashOn={flashOn}
              onToggleFlash={toggleFlash}
            />
          )}
        </View>
      </SafeAreaView>

      {/* Loading Overlay during scan processing */}
      {scanning && (
        <View
          style={StyleSheet.absoluteFill}
          className="bg-black/40 items-center justify-center p-6 z-50"
        >
          <View className="w-16 h-16 rounded-3xl bg-brand-500/20 border border-brand-500/40 items-center justify-center mb-4">
            <ActivityIndicator size="large" color="#10B981" />
          </View>
          <Typography variant="h3" className="text-white font-bold mb-1 text-center">
            {mode === "barcode"
              ? "Resolving Barcode..."
              : mode === "receipt"
              ? "Reading your receipt..."
              : mode === "tag"
              ? "Reading the expiry date..."
              : "Analyzing your photo..."}
          </Typography>
          <Typography variant="caption" className="text-white/70 text-center">
            {mode === "barcode"
              ? "Extracting item name, brand, and storage zone"
              : "Detecting items, quantities, and expiration dates"}
          </Typography>
        </View>
      )}
    </View>
  );
}
