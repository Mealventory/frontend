import React, { useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Icon } from "@/src/components/atoms";
import { BarcodeScannerFrame, CameraOverlayControls } from "@/src/components/molecules";

export default function FullscreenScannerModal() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      router.push("/(modal)/ai-review" as any);
    }, 1200);
  };

  return (
    <SafeAreaView className="flex-1 bg-black justify-between">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-5 pt-3">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.back()}
          className="w-10 h-10 rounded-2xl bg-white/10 items-center justify-center border border-white/10"
        >
          <Icon name="X" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Typography variant="h3" className="text-white font-bold">
          Camera Scanner
        </Typography>
        <View className="w-10" />
      </View>

      {/* Reticle Viewfinder */}
      <BarcodeScannerFrame
        scanning={scanning}
        instructionText="Align barcode or receipt within the box"
      />

      {/* Bottom Controls */}
      <CameraOverlayControls
        onScan={handleScan}
        scanning={scanning}
        flashOn={flashOn}
        onToggleFlash={() => setFlashOn(!flashOn)}
      />
    </SafeAreaView>
  );
}
