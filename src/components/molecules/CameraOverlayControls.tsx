import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Icon } from "../atoms/Icon";
import { Button } from "../atoms/Button";

export interface CameraOverlayControlsProps {
  onScan: () => void;
  onToggleFlash?: () => void;
  flashOn?: boolean;
  scanning?: boolean;
  className?: string;
}

export function CameraOverlayControls({
  onScan,
  onToggleFlash,
  flashOn = false,
  scanning = false,
  className = "",
}: CameraOverlayControlsProps) {
  return (
    <View className={`flex-row items-center gap-3 px-5 pb-6 ${className}`}>
      {onToggleFlash && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onToggleFlash}
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

      <Button
        label={scanning ? "Scanning..." : "Tap to Scan"}
        variant="primary"
        size="lg"
        loading={scanning}
        onPress={onScan}
        className="flex-1"
        leadingIcon={!scanning ? <Icon name="Camera" size={20} color="#FFFFFF" /> : undefined}
      />
    </View>
  );
}
