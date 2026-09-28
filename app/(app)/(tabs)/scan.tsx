import React, { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Text,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Typography, Icon, Button } from "@/src/components/atoms";
import { BarcodeScannerFrame, CameraOverlayControls } from "@/src/components/molecules";
import { useAuth } from "@/src/context/AuthContext";
import { supabase } from "@/src/lib/supabase";
import { uploadScanImage, ScanMode } from "@/src/lib/scanApi";

const MODES: { id: ScanMode; label: string; icon: "Apple" | "Receipt" | "Tag"; instruction: string }[] = [
  { id: "food", label: "Food", icon: "Apple", instruction: "Center the food item in the frame" },
  { id: "receipt", label: "Receipt", icon: "Receipt", instruction: "Align store receipt inside the frame" },
  { id: "tag", label: "Tag / Label", icon: "Tag", instruction: "Focus on expiration date or product label" },
];

export default function ScanTabScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const isFocused = pathname.includes("/scan");
  const { session, household } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [mode, setMode] = useState<ScanMode>("food");
  const [scanning, setScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeModeConfig = MODES.find((m) => m.id === mode) || MODES[0];

  const getAccessToken = async (): Promise<string> => {
    if (session?.access_token) return session.access_token;
    const result = await supabase?.auth.getSession();
    if (result?.data?.session?.access_token) return result.data.session.access_token;
    throw new Error("Please sign in again to scan items.");
  };

  const handleScan = async () => {
    if (scanning) return;
    setErrorMessage(null);
    setScanning(true);

    try {
      let imageUri: string | null = null;

      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        imageUri = photo?.uri || null;
      }

      if (!imageUri) {
        throw new Error("Unable to capture camera frame. Please try again.");
      }

      const token = await getAccessToken();
      const householdId = household?.id;
      if (!householdId) {
        throw new Error("Please select a household before scanning.");
      }

      const scannedItems = await uploadScanImage({
        token,
        householdId,
        mode,
        imageUri,
      });

      router.push({
        pathname: "/(modal)/ai-review",
        params: {
          items: JSON.stringify(scannedItems),
          mode,
        },
      } as any);
    } catch (err: any) {
      const msg = err?.message || "Scan failed. Please retry.";
      setErrorMessage(msg);
    } finally {
      setScanning(false);
    }
  };

  if (!permission) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#10B981" />
        <Typography variant="body" className="text-white/70 mt-4">
          Initializing camera...
        </Typography>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-black justify-between p-6">
        <View className="items-center mt-6">
          <Typography variant="h2" className="text-white mb-1">
            Scan Item
          </Typography>
          <Typography variant="caption" className="text-white/60">
            AI-powered camera scanner
          </Typography>
        </View>

        <View className="items-center px-4">
          <View className="w-20 h-20 rounded-full bg-brand-500/10 border border-brand-500/20 items-center justify-center mb-6">
            <Icon name="Camera" size={36} color="#10B981" />
          </View>
          <Typography variant="h2" className="text-white font-bold text-center mb-2">
            Camera Access Required
          </Typography>
          <Typography variant="body" className="text-white/60 text-center mb-6">
            Mealventory needs camera access to scan food items, store receipts, and expiration labels.
          </Typography>
          <Button
            label="Grant Camera Permission"
            variant="primary"
            size="lg"
            onPress={requestPermission}
            className="w-full"
            leadingIcon={<Icon name="Camera" size={20} color="#FFFFFF" />}
          />
        </View>

        <View className="gap-3 mb-4">
          <Button
            label="Manual Entry Instead"
            variant="outline"
            className="border-white/20"
            labelClassName="text-white"
            onPress={() => router.push("/(modal)/manual-add" as any)}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/* Real Live Camera Preview */}
      <CameraView
        ref={cameraRef}
        facing="back"
        enableTorch={flashOn}
        active={isFocused}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        onMountError={(e) => setErrorMessage(e?.message || "Failed to initialize camera")}
      />

      <SafeAreaView className="flex-1 justify-between">
        {/* Top Header */}
        <View className="flex-row items-center justify-between px-5 pt-3">
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(modal)/manual-add" as any)}
            className="px-3 py-1.5 rounded-full bg-black/40 border border-white/15 flex-row items-center"
          >
            <Icon name="Plus" size={14} color="#FFFFFF" />
            <Text className="text-white text-xs font-medium ml-1.5">Manual</Text>
          </TouchableOpacity>

          <View className="items-center">
            <Typography variant="h3" className="text-white font-bold">
              Scan Item
            </Typography>
            <Typography variant="caption" className="text-white/60">
              {household?.name || "Kitchen"}
            </Typography>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(modal)/scanner" as any)}
            className="w-9 h-9 rounded-2xl bg-black/40 items-center justify-center border border-white/15"
          >
            <Icon name="Maximize" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Reticle Viewfinder & Mode Instruction */}
        <View className="items-center justify-center my-auto">
          <BarcodeScannerFrame
            scanning={scanning}
            instructionText={activeModeConfig.instruction}
          />
        </View>

        {/* Bottom Section: Error Toast + Mode Switcher + Controls */}
        <View className="px-5 pb-4">
          {errorMessage && (
            <View className="mb-4 p-3.5 rounded-2xl bg-danger-500/90 border border-danger-400 flex-row items-center justify-between shadow-lg">
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

          {/* Mode Selector Chips */}
          <View className="flex-row items-center justify-center gap-2 mb-4 bg-black/50 p-1.5 rounded-full border border-white/10 self-center">
            {MODES.map((m) => {
              const isSelected = mode === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.7}
                  disabled={scanning}
                  onPress={() => {
                    setErrorMessage(null);
                    setMode(m.id);
                  }}
                  className={`flex-row items-center px-4 py-2 rounded-full ${
                    isSelected ? "bg-brand-500" : "bg-transparent"
                  }`}
                >
                  <Icon
                    name={m.icon}
                    size={14}
                    color={isSelected ? "#FFFFFF" : "#94A3B8"}
                  />
                  <Text
                    className={`ml-1.5 text-[13px] font-semibold ${
                      isSelected ? "text-white" : "text-white/60"
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
            onScan={handleScan}
            scanning={scanning}
            flashOn={flashOn}
            onToggleFlash={() => setFlashOn((prev) => !prev)}
          />
        </View>
      </SafeAreaView>

      {/* Full-screen Loading Overlay during AI scan processing */}
      {scanning && (
        <View
          style={StyleSheet.absoluteFill}
          className="bg-black/75 items-center justify-center p-6 z-50"
        >
          <View className="w-16 h-16 rounded-3xl bg-brand-500/20 border border-brand-500/40 items-center justify-center mb-4">
            <ActivityIndicator size="large" color="#10B981" />
          </View>
          <Typography variant="h3" className="text-white font-bold mb-1 text-center">
            Analyzing with Gemini Vision...
          </Typography>
          <Typography variant="caption" className="text-white/70 text-center">
            Detecting food items, quantities, and expiration dates
          </Typography>
        </View>
      )}
    </View>
  );
}
