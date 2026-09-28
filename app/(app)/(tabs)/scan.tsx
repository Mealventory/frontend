import React, { useState, useRef, useCallback } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
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

const MODES: { id: ScannerMode; label: string; icon: "Apple" | "Receipt" | "Barcode"; instruction: string }[] = [
  { id: "food", label: "Product", icon: "Apple", instruction: "Center product or grocery items in frame" },
  { id: "receipt", label: "Receipt", icon: "Receipt", instruction: "Align store receipt within boundary guides" },
  { id: "barcode", label: "Barcode", icon: "Barcode", instruction: "Position barcode in frame for instant auto-scan" },
];

export default function ScanTabScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = pathname.includes("/scan");
  const { session, household } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [mode, setMode] = useState<ScannerMode>("food");
  const [scanning, setScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isProcessingBarcode = useRef(false);

  const activeModeConfig = MODES.find((m) => m.id === mode) || MODES[0];

  const getAccessToken = async (): Promise<string> => {
    if (session?.access_token) return session.access_token;
    const result = await supabase?.auth.getSession();
    if (result?.data?.session?.access_token) return result.data.session.access_token;
    throw new Error("Please sign in again to scan items.");
  };

  const handleBarcodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (!isFocused || mode !== "barcode" || scanning || isProcessingBarcode.current) {
        return;
      }

      const barcodeData = result?.data?.trim();
      if (!barcodeData) return;

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

        router.push({
          pathname: "/(modal)/ai-review",
          params: {
            items: JSON.stringify([resolvedProduct]),
            mode: "barcode",
            barcode: barcodeData,
          },
        } as any);
      } catch (err: any) {
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
        setTimeout(() => {
          isProcessingBarcode.current = false;
          setScanning(false);
        }, 1500);
      }
    },
    [isFocused, mode, scanning, router]
  );

  const processScannedImage = async (rawUri: string) => {
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
          router.push({
            pathname: "/(modal)/ai-review",
            params: {
              items: JSON.stringify([resolvedProduct]),
              mode: "barcode",
              barcode: barcodeData,
            },
          } as any);
        } catch {
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
        maxWidth: 1600,
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

      router.push({
        pathname: "/(modal)/ai-review",
        params: {
          items: JSON.stringify(scannedItems),
          mode,
        },
      } as any);
    } catch (err: any) {
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
        msg = `${elementName} could not be detected. Please adjust camera framing and retry.`;
      } else if (rawMsg.toLowerCase().includes("abort") || rawMsg.toLowerCase().includes("timeout")) {
        msg = "Scan request timed out. Please check your connection and retry.";
      } else if (rawMsg.toLowerCase().includes("network") || rawMsg.toLowerCase().includes("offline")) {
        msg = "Network connection error. Please verify your connection and retry.";
      } else {
        msg = `${elementName} could not be detected. Please adjust camera framing and retry.`;
      }
      setErrorMessage(msg);
    } finally {
      setScanning(false);
    }
  };

  const handlePickImage = async () => {
    if (scanning) return;
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

      const pickedUri = pickerResult.assets[0].uri;
      if (pickedUri) {
        await processScannedImage(pickedUri);
      }
    } catch (err: any) {
      const elementName = mode === "receipt" ? "Receipt" : mode === "barcode" ? "Barcode" : mode === "tag" ? "Tag" : "Product";
      setErrorMessage(`${elementName} could not be detected. Please adjust camera framing and retry.`);
    }
  };

  const handleScan = async () => {
    if (scanning) return;
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

    if (!imageUri) {
      setErrorMessage("Unable to capture camera frame. Please try again.");
      return;
    }

    await processScannedImage(imageUri);
  };

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
      {isFocused && (
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

      <SafeAreaView edges={["top", "left", "right"]} className="flex-1 justify-between">
        {/* Top Header */}
        <View className="flex-row items-center justify-between px-5 pt-3">
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={scanning}
            onPress={handlePickImage}
            accessibilityLabel="Choose photo from gallery"
            className="w-10 h-10 rounded-2xl bg-black/50 items-center justify-center border border-white/20"
          >
            <Icon name="Image" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="items-center">
            <Typography variant="h3" className="text-white font-bold">
              AI Scanner
            </Typography>
            <Typography variant="caption" className="text-white/70">
              {household?.name || "Kitchen"}
            </Typography>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(modal)/manual-add" as any)}
            className="w-10 h-10 rounded-2xl bg-black/50 items-center justify-center border border-white/20"
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
            <View className="mb-4 p-3.5 rounded-2xl bg-danger-500/95 border border-danger-400 flex-row items-center justify-between shadow-lg">
              <View className="flex-row items-center flex-1 mr-2">
                <Icon name="AlertCircle" size={18} color="#FFFFFF" />
                <Text className="text-white text-[13px] font-medium ml-2 flex-1">
                  {errorMessage}
                </Text>
              </View>
              <TouchableOpacity
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
                  key={m.id}
                  activeOpacity={0.75}
                  disabled={scanning}
                  onPress={() => {
                    setErrorMessage(null);
                    setMode(m.id);
                  }}
                  className={`flex-1 flex-row items-center justify-center py-2 px-2 rounded-full ${
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
          <CameraOverlayControls
            mode={mode}
            onScan={handleScan}
            scanning={scanning}
            flashOn={flashOn}
            onToggleFlash={() => setFlashOn((prev) => !prev)}
          />
        </View>
      </SafeAreaView>

      {/* Loading Overlay during scan processing */}
      {scanning && (
        <View
          style={StyleSheet.absoluteFill}
          className="bg-black/80 items-center justify-center p-6 z-50"
        >
          <View className="w-16 h-16 rounded-3xl bg-brand-500/20 border border-brand-500/40 items-center justify-center mb-4">
            <ActivityIndicator size="large" color="#10B981" />
          </View>
          <Typography variant="h3" className="text-white font-bold mb-1 text-center">
            {mode === "barcode"
              ? "Resolving Product Barcode..."
              : mode === "receipt"
              ? "Reading Store Receipt OCR..."
              : mode === "tag"
              ? "Reading Tag with Vision AI..."
              : "Analyzing with Gemini Vision..."}
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
