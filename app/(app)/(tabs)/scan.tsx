import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Button, Icon } from "@/src/components/atoms";
import { BarcodeScannerFrame } from "@/src/components/molecules";

export default function ScanTabScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-black justify-between p-6">
      <View className="items-center mt-6">
        <Typography variant="h2" className="text-white mb-1">
          Scan Item
        </Typography>
        <Typography variant="caption" className="text-white/60">
          Capture barcode or receipt
        </Typography>
      </View>

      <BarcodeScannerFrame
        scanning
        instructionText="Point camera at product barcode or grocery receipt"
      />

      <View className="gap-3 mb-6">
        <Button
          label="Open Fullscreen Camera Modal"
          variant="primary"
          leadingIcon={<Icon name="Camera" size={18} color="#FFFFFF" />}
          onPress={() => router.push("/(modal)/scanner" as any)}
        />
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
