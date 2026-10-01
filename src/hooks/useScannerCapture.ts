import { useState, useRef, useCallback, useLayoutEffect } from "react";
import { useRouter } from "expo-router";
import { useScannerActive } from "@/src/hooks/useScannerActive";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
  scanFromURLAsync,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { uploadScanImage, ScannerMode } from "@/src/lib/scanApi";
import { compressImageForUpload } from "@/src/lib/imageOptimizer";
import { fetchProductByBarcode } from "@/src/lib/barcodeApi";

export type ScannerModeConfig = {
  id: ScannerMode;
  label: string;
  icon: "Apple" | "Receipt" | "Barcode" | "Tag" | "Calendar";
  instruction: string;
};

export const SCANNER_MODES: ScannerModeConfig[] = [
  { id: "food", label: "Item", icon: "Apple", instruction: "Center item in frame" },
  { id: "tag", label: "Tag", icon: "Calendar", instruction: "Fill the frame with the printed best-before date" },
  { id: "receipt", label: "Receipt", icon: "Receipt", instruction: "Align store receipt within boundary guides" },
  { id: "barcode", label: "Barcode", icon: "Barcode", instruction: "Position barcode in frame for instant auto-scan" },
];

export const BARCODE_TYPES = [
  "qr",
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "itf14",
] as const;

export const MODES = SCANNER_MODES;

export interface UseScannerCaptureOptions {
  initialMode?: ScannerMode;
}

export function useScannerCapture(options: UseScannerCaptureOptions = {}) {
  const router = useRouter();
  const isFocused = useScannerActive();
  const scanGeneration = useRef(0);
  const activeRef = useRef(false);

  const { session, household } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [mode, setMode] = useState<ScannerMode>(options.initialMode || "food");
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

  const activeModeConfig =
    SCANNER_MODES.find((m) => m.id === mode) || SCANNER_MODES[0];

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

      const generation = scanGeneration.current;
      isProcessingBarcode.current = true;
      setScanning(true);
      setErrorMessage(null);

      try {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
          // Graceful fallback on web or unsupported environments
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
        if (activeRef.current && generation === scanGeneration.current) setScanning(false);
      }
    },
    [isFocused, mode, scanning, router]
  );

  const processScannedImage = async (rawUri: string) => {
    if (captureLock.current || !activeRef.current) return;
    captureLock.current = true;
    const generation = scanGeneration.current;
    if (mode !== "barcode") {
      setCapturedPhoto(rawUri);
      setFlashOn(false);
    }
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
      const elementName =
        mode === "receipt"
          ? "Receipt"
          : mode === "barcode"
          ? "Barcode"
          : mode === "tag"
          ? "Tag"
          : "Item";
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
      setErrorMessage(msg);
    } finally {
      if (activeRef.current && generation === scanGeneration.current) {
        captureLock.current = false;
        setScanning(false);
      }
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
        else {
          setCapturedPhoto(pickedUri);
          setFlashOn(false);
        }
      }
    } catch (err: any) {
      const elementName =
        mode === "receipt"
          ? "Receipt"
          : mode === "barcode"
          ? "Barcode"
          : mode === "tag"
          ? "Tag"
          : "Item";
      setErrorMessage(`${elementName} could not be detected. Please adjust camera framing and retry.`);
    }
  };

  const handleScan = async () => {
    if (scanning || captureLock.current) return;
    if (capturedPhoto) {
      setCapturedPhoto(null);
      setErrorMessage(null);
      return;
    }
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
      setErrorMessage("Unable to capture camera frame. Please try again.");
      return;
    }

    if (mode === "barcode") await processScannedImage(imageUri);
    else {
      setCapturedPhoto(imageUri);
      setFlashOn(false);
      setScanning(false);
    }
  };

  const retakePhoto = () => {
    if (captureLock.current) return;
    setCapturedPhoto(null);
    setErrorMessage(null);
  };

  const selectMode = (newMode: ScannerMode) => {
    setErrorMessage(null);
    if (captureLock.current) return;
    scanGeneration.current++;
    setMode(newMode);
    setCapturedPhoto(null);
  };

  const toggleFlash = () => {
    setFlashOn((prev) => !prev);
  };

  return {
    mode,
    setMode,
    selectMode,
    scanning,
    setScanning,
    capturedPhoto,
    setCapturedPhoto,
    retakePhoto,
    flashOn,
    setFlashOn,
    toggleFlash,
    errorMessage,
    setErrorMessage,
    activeModeConfig,
    modes: SCANNER_MODES,
    barcodeTypes: BARCODE_TYPES,
    permission,
    requestPermission,
    cameraRef,
    isFocused,
    household,
    captureLock,
    scanGeneration,
    activeRef,
    handleBarcodeScanned,
    handleScan,
    handlePickImage,
    processScannedImage,
  };
}
