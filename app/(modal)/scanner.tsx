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
import {
  useScannerCapture,
  SCANNER_MODES,
  BARCODE_TYPES,
  SCANNER_MODES as MODES,
} from "@/src/hooks/useScannerCapture";

// Supported modes configuration:
// - Product: id: "food"
// - Tag: id: "tag"
// - Receipt: id: "receipt"
// - Barcode: id: "barcode"

export default function FullscreenScannerModal() {
  const router = useRouter();
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
    household,
  } = useScannerCapture();

  // Permission: loading state
  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#10B981" />
        <Typography variant="body" className="text-white/70 mt-4">
          Initializing camera engine...
        </Typography>
      </SafeAreaView>
    );
  }

  // Permission: denied / not granted state
  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-between p-6">
        <View className="flex-row items-center justify-between pt-2">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            activeOpacity={0.7}
            onPress={() => router.back()}
            className="w-11 h-11 rounded-2xl bg-white/10 items-center justify-center border border-white/10"
          >
            <Icon name="X" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Typography variant="h3" className="text-white font-bold">
            Camera Permission
          </Typography>
          <View className="w-11" />
        </View>

        <View className="items-center px-4">
          <View className="w-24 h-24 rounded-full bg-brand-500/10 border border-brand-500/30 items-center justify-center mb-6">
            <Icon name="Camera" size={40} color="#10B981" />
          </View>
          <Typography variant="h2" className="text-white font-bold text-center mb-2">
            Camera Access Required
          </Typography>
          <Typography variant="body" className="text-white/70 text-center mb-6 leading-6">
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
            onPress={() => router.replace("/(modal)/manual-add" as any)}
          />
        </View>

        <Button
          label="Cancel"
          variant="ghost"
          size="md"
          onPress={() => router.back()}
          className="mb-4"
        />
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

      <SafeAreaView className="flex-1 justify-between">
        {/* Top Header */}
        <View className="flex-row items-center justify-between px-5 pt-3">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            activeOpacity={0.7}
            onPress={() => router.back()}
            className="w-11 h-11 rounded-2xl bg-black/50 items-center justify-center border border-white/20"
          >
            <Icon name="X" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="items-center">
            <BrandLogo width={112} />
            <Typography variant="h3" className="text-white font-bold">
              AI Scanner
            </Typography>
            <Typography variant="caption" className="text-white/70">
              {household?.name || "Kitchen"}
            </Typography>
          </View>

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
          <View className="w-full max-w-[340px] self-center flex-row items-center justify-between mb-4 bg-black/60 p-1 rounded-full border border-white/20">
            {modes.map((m) => {
              const isSelected = mode === m.id;
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
                    className={`ml-1.5 text-[12.5px] font-semibold ${
                      isSelected ? "text-white" : "text-white/70"
                    }`}
                  >
                    {m.label}
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
