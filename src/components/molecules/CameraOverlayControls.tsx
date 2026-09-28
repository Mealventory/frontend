import React from "react";
import { View, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { Icon } from "../atoms/Icon";

export interface CameraOverlayControlsProps {
  onScan: () => void;
  onToggleFlash?: () => void;
  flashOn?: boolean;
  scanning?: boolean;
  className?: string;
  mode?: "food" | "receipt" | "barcode" | "tag";
}

export function CameraOverlayControls({
  onScan,
  onToggleFlash,
  flashOn = false,
  scanning = false,
  className = "",
  mode = "food",
}: CameraOverlayControlsProps) {
  const isBarcodeMode = mode === "barcode";

  return (
    <View className={`flex-row items-center gap-3 px-5 pb-6 ${className}`}>
      {onToggleFlash && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onToggleFlash}
          accessibilityLabel={flashOn ? "Turn flash off" : "Turn flash on"}
          className={`w-12 h-12 rounded-2xl items-center justify-center border ${
            flashOn
              ? "bg-brand-500 border-brand-500"
              : "bg-white/10 border-white/20"
          }`}
        >
          <Icon
            name={flashOn ? "Zap" : "ZapOff"}
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      )}

      {isBarcodeMode ? (
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={scanning}
          onPress={onScan}
          accessibilityLabel="Auto-scanning barcode"
          className="flex-1 h-12 bg-white/15 border border-white/25 rounded-2xl flex-row items-center justify-center px-4"
        >
          <View className="w-2.5 h-2.5 rounded-full bg-brand-500 mr-2 animate-pulse" />
          <Icon name="Barcode" size={18} color="#FFFFFF" />
          <Text className="text-white font-semibold text-[14px] ml-2">
            {scanning ? "Reading Barcode..." : "Auto-Scanning Barcode"}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={scanning}
          onPress={onScan}
          accessibilityLabel={scanning ? "Analyzing image" : "Capture and review"}
          className="flex-1 h-12 bg-brand-500 active:bg-brand-600 border border-brand-500 rounded-2xl flex-row items-center justify-center px-4 shadow-sm"
        >
          {scanning ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-white font-bold text-[14px] ml-2">
                Analyzing...
              </Text>
            </>
          ) : (
            <>
              <Icon name="Camera" size={18} color="#FFFFFF" />
              <Text className="text-white font-bold text-[14px] ml-2">
                Capture & Review
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
