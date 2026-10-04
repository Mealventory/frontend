import { BrandLogo } from "@/src/components/atoms/BrandLogo";
import React, { useState, useRef, useCallback, useLayoutEffect } from "react";
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
import { useScannerActive } from "@/src/hooks/useScannerActive";
import { CameraView, useCameraPermissions, BarcodeScanningResult, scanFromURLAsync } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { Typography, Icon, Button } from "@/src/components/atoms";
import { BarcodeScannerFrame, CameraOverlayControls } from "@/src/components/molecules";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { uploadScanImage, ScanMode, ScannerMode } from "@/src/lib/scanApi";
import { compressImageForUpload } from "@/src/lib/imageOptimizer";
import { fetchProductByBarcode } from "@/src/lib/barcodeApi";
import { recordScanFailure } from "@/src/lib/scanHistory";
import {
  E2E_BARCODE_SCAN_ITEMS,
  E2E_PRODUCT_SCAN_ITEMS,
} from "@/src/lib/e2e";

const MODES: { id: ScannerMode; label: string; icon: "Apple" | "Receipt" | "Barcode" | "Tag" | "Calendar"; instruction: string }[] = [
  { id: "food", label: "Product", icon: "Apple", instruction: "Center product or grocery items in frame" },
  { id: "tag", label: "Tag", icon: "Calendar", instruction: "Fill the frame with the printed best-before date" },
  { id: "receipt", label: "Receipt", icon: "Receipt", instruction: "Align store receipt within boundary guides" },
  { id: "barcode", label: "Barcode", icon: "Barcode", instruction: "Position barcode in frame for instant auto-scan" },
];

export default function ScanTabScreen() {
  const router = useRouter();
  const isFocused = useScannerActive();
  const scanGeneration = useRef(0);
  const activeRef = useRef(false);

  const { session, household, e2eMode } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [mode, setMode] = useState<ScannerMode>("food");
  const [scanning, setScanning] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const captureLock = useRef(false);
  const [flashOn, setFlashOn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isProcessingBarcode = useRef(false);
  useLayoutEffect(() => {
    scanGeneration.current++;
    activeRef.current = isFocused;
    isProcessingBarcode.current = false;
    setScanning(false);
    setFlashOn(false);
    setCapturedPhoto(null);
    captureLock.current = false;
    setErrorMessage(null);
    return () => {
      activeRef.current = false;
      scanGeneration.current++;
      isProcessingBarcode.current = false;
    };
  }, [isFocused]);


  const activeModeConfig = MODES.find((m) => m.id === mode) || MODES[0];

  const getAccessToken = async (): Promise<string> => {
    if (session?.access_token) return session.access_token;
    const result = await supabase?.auth.getSession();
    if (result?.data?.session?.access_token) return result.data.session.access_token;
    throw new Error("Please sign in again to scan items.");
  };

  const showScanFailure = (message: string) => {
    setErrorMessage(message);
    if (session?.user?.id && household?.id) {
      void recordScanFailure(
        { userId: session.user.id, householdId: household.id },
        mode,
        message,
      );
    }
  };

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (!isFocused || mode !== "barcode" || scanning || isProcessingBarcode.current) {
        return;
      }

      const barcodeData = result?.data?.trim();
      if (!barcodeData) return;

      const generation = scanGeneration.current;
      isProcessingBarcode.current = true;
      setScanning(true);
      setErrorMessage(null);

      try {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // Graceful fallback
        }

        const resolvedProduct = await fetchProductByBarcode(barcodeData);

        if (!activeRef.current || generation !== scanGeneration.current) return;
        router.push({
          pathname: "/(modal)/ai-review",
          params: {
            items: JSON.stringify([resolvedProduct]),
            mode: "barcode",
            barcode: barcodeData,
          },
        } as any);
      } catch (err: any) {
        if (!activeRef.current || generation !== scanGeneration.current) return;
        router.push({
          pathname: "/(modal)/ai-review",
          params: {
            items: JSON.stringify([
              {
                name: `Item (${barcodeData})`,
                category: "Pantry",
                quantity: 1,
                unit: "units",
                expiry_date: null,
                storageZone: "pantry",
                confidence: 1.0,
              },
            ]),
            mode: "barcode",
            barcode: barcodeData,
          },
        } as any);
      } finally {
        // Keep auto-scan locked after navigation; focus restoration resets it.
        if (activeRef.current && generation === scanGeneration.current) setScanning(false);
      }
    },
    [isFocused, mode, scanning, router]
  );

  const processScannedImage = async (rawUri: string) => {
    if (captureLock.current || !activeRef.current) return;
    captureLock.current = true;
    const generation = scanGeneration.current;
    if (mode !== "barcode") { setCapturedPhoto(rawUri); setFlashOn(false); }
    setErrorMessage(null);
    setScanning(true);

    try {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {
        // Silently continue
      }

      if (mode === "barcode") {
        let barcodeData: string | null = null;
        try {
          const barcodeResults = await scanFromURLAsync(rawUri, [
            "qr",
            "ean13",
            "ean8",
            "upc_a",
            "upc_e",
            "code128",
            "code39",
            "itf14",
          ]);
          if (barcodeResults && barcodeResults.length > 0 && barcodeResults[0]?.data) {
            barcodeData = barcodeResults[0].data.trim();
          }
        } catch {
          // Native barcode scanner fallback
        }

        if (!barcodeData) {
          throw new Error("Barcode could not be detected. Please adjust camera framing and retry.");
        }

        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // Graceful fallback
        }

        try {
          const resolvedProduct = await fetchProductByBarcode(barcodeData);
          if (!activeRef.current || generation !== scanGeneration.current) return;
          router.push({
            pathname: "/(modal)/ai-review",
            params: {
              items: JSON.stringify([resolvedProduct]),
              mode: "barcode",
              barcode: barcodeData,
            },
          } as any);
        } catch {
          if (!activeRef.current || generation !== scanGeneration.current) return;
          router.push({
            pathname: "/(modal)/ai-review",
            params: {
              items: JSON.stringify([
                {
                  name: `Item (${barcodeData})`,
                  category: "Pantry",
                  quantity: 1,
                  unit: "units",
                  expiry_date: null,
                  storageZone: "pantry",
                  confidence: 1.0,
                },
              ]),
              mode: "barcode",
              barcode: barcodeData,
            },
          } as any);
        }
        return;
      }

      const compressedUri = await compressImageForUpload(rawUri, {
        maxWidth: mode === "food" ? 1600 : 2400,
        quality: 0.8,
      });

      const token = await getAccessToken();
      const householdId = household?.id;
      if (!householdId) {
        throw new Error("Please select a household before scanning.");
      }

      const scannedItems = await uploadScanImage({
        token,
        householdId,
        mode,
        imageUri: compressedUri,
      });

      if (!activeRef.current || generation !== scanGeneration.current) return;
      router.push({
        pathname: "/(modal)/ai-review",
        params: {
          items: JSON.stringify(scannedItems),
          mode,
        },
      } as any);
    } catch (err: any) {
      if (!activeRef.current || generation !== scanGeneration.current) return;
      const elementName = mode === "receipt" ? "Receipt" : mode === "barcode" ? "Barcode" : mode === "tag" ? "Tag" : "Product";
      const rawMsg = (err?.message || "").trim();
      let msg: string;

      if (
        rawMsg.toLowerCase().includes("formdatapart") ||
        rawMsg.toLowerCase().includes("formatdatapart") ||
        rawMsg.toLowerCase().includes("arraybuffer") ||
        rawMsg.toLowerCase().includes("creating blobs") ||
        rawMsg.toLowerCase().includes("could not be detected") ||
        rawMsg.toLowerCase().includes("no food") ||
        rawMsg.toLowerCase().includes("not detected") ||
        rawMsg.toLowerCase().includes("unable to capture") ||
        rawMsg.toLowerCase().includes("cannot decode") ||
        rawMsg.toLowerCase().includes("mismatch") ||
        !rawMsg
      ) {
        msg = rawMsg || `${elementName} could not be detected. Please adjust camera framing and retry.`;
      } else if (rawMsg.toLowerCase().includes("abort") || rawMsg.toLowerCase().includes("timeout")) {
        msg = "Scan request timed out. Please check your connection and retry.";
      } else if (rawMsg.toLowerCase().includes("network") || rawMsg.toLowerCase().includes("offline")) {
        msg = "Network connection error. Please verify your connection and retry.";
      } else {
        msg = rawMsg || `${elementName} could not be detected. Please adjust camera framing and retry.`;
      }
      showScanFailure(msg);
    } finally {
      if (activeRef.current && generation === scanGeneration.current) { captureLock.current = false; setScanning(false); }
    }
  };

  const handlePickImage = async () => {
    if (scanning || captureLock.current) return;
    const generation = scanGeneration.current;
    setErrorMessage(null);

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setErrorMessage("Gallery permission is required to choose photos.");
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.85,
      });

      if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
        return;
      }

      if (!activeRef.current || generation !== scanGeneration.current) return;
      const pickedUri = pickerResult.assets[0].uri;
      if (pickedUri) {
        if (mode === "barcode") await processScannedImage(pickedUri);
        else { setCapturedPhoto(pickedUri); setFlashOn(false); }
      }
    } catch (err: any) {
      const elementName = mode === "receipt" ? "Receipt" : mode === "barcode" ? "Barcode" : mode === "tag" ? "Tag" : "Product";
      showScanFailure(`${elementName} could not be detected. Please adjust camera framing and retry.`);
    }
  };

  const handleScan = async () => {
    if (scanning || captureLock.current) return;
    if (capturedPhoto) { setCapturedPhoto(null); setErrorMessage(null); return; }
    captureLock.current = true;
    const generation = scanGeneration.current;
    setScanning(true);
    setErrorMessage(null);

    let imageUri: string | null = null;

    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          base64: true,
        });
        if (photo?.uri) {
          imageUri = photo.uri;
        } else if (photo?.base64) {
          imageUri = `data:image/jpeg;base64,${photo.base64}`;
        }
      } catch {
        // Handled below
      }
    }

    if (!activeRef.current || generation !== scanGeneration.current) return;
    captureLock.current = false;
    if (!imageUri) {
      setScanning(false);
      showScanFailure("Unable to capture camera frame. Please try again.");
      return;
    }

    if (mode === "barcode") await processScannedImage(imageUri);
    else { setCapturedPhoto(imageUri); setFlashOn(false); setScanning(false); }
  };

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
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-black items-center justify-center">
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
      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-black justify-between p-6">
        <View className="flex-row items-center justify-between pt-2">
          <Typography variant="h2" className="text-white mb-1">
            Scan Item
          </Typography>
          <Typography variant="h3" className="text-white font-bold">
            Camera Permission
          </Typography>
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
            barcodeTypes: [
              "qr",
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
              "code128",
              "code39",
              "itf14",
            ],
          }}
          onBarcodeScanned={mode === "barcode" ? handleBarcodeScanned : undefined}
          style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
          onMountError={(e) =>
            setErrorMessage(e?.message || "Failed to initialize camera")
          }
        />
      )}

      {capturedPhoto && <Image source={{ uri: capturedPhoto }} resizeMode="cover"
        accessibilityLabel="Captured photo being analyzed" style={StyleSheet.absoluteFill} />}

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
          <View className="w-full max-w-[340px] self-center flex-row items-center justify-between mb-4 bg-black/60 p-1 rounded-full border border-white/20">
            {MODES.map((m) => {
              const isSelected = mode === m.id;
              return (
                <TouchableOpacity
                  key={`${m.id}-${m.label}`}
                  accessibilityRole="radio"
                  accessibilityLabel={`${m.label} scan mode`}
                  accessibilityState={{ checked: isSelected, disabled: scanning }}
                  activeOpacity={0.75}
                  disabled={scanning}
                  onPress={() => {
                    setErrorMessage(null);
                    if (captureLock.current) return;
                    scanGeneration.current++;
                    setMode(m.id); setCapturedPhoto(null);
                  }}
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
          {capturedPhoto && !scanning ? <View className="gap-3 p-3 rounded-3xl bg-black/70 border border-white/20">
            <Typography className="text-white text-center text-sm font-medium px-2">Ready to scan? Check that your photo is clear.</Typography>
            <View className="flex-row gap-3">
              <View className="flex-1"><Button label="Retake photo" variant="secondary" className="min-h-[52px] rounded-2xl px-3" onPress={() => {
                if (captureLock.current) return;
                setCapturedPhoto(null); setErrorMessage(null);
              }} /></View>
              <View className="flex-1"><Button label="Use Photo" className="min-h-[52px] rounded-2xl px-3" onPress={() => void processScannedImage(capturedPhoto)} /></View>
            </View>
          </View> : <CameraOverlayControls
            mode={mode}
            onScan={handleScan}
            scanning={scanning}
            flashOn={flashOn}
            onToggleFlash={() => setFlashOn((prev) => !prev)}
          />}
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
              ? "Resolving Product Barcode..."
              : mode === "receipt"
              ? "Reading your receipt..."
              : mode === "tag"
              ? "Reading the expiry date..."
              : "Analyzing your photo..."}
          </Typography>
          <Typography variant="caption" className="text-white/70 text-center">
            {mode === "barcode"
              ? "Extracting product name, brand, and storage zone"
              : "Detecting items, quantities, and expiration dates"}
          </Typography>
        </View>
      )}
    </View>
  );
}
