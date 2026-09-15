import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { Typography } from "../atoms/Typography";
import { Icon } from "../atoms/Icon";

export interface BarcodeScannerFrameProps {
  scanning?: boolean;
  instructionText?: string;
  className?: string;
}

export function BarcodeScannerFrame({
  scanning = false,
  instructionText = "Align barcode or item inside the frame",
  className = "",
}: BarcodeScannerFrameProps) {
  const laserAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 210,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      laserAnim.setValue(105);
    }
  }, [scanning, laserAnim]);

  return (
    <View className={`items-center justify-center ${className}`}>
      {/* 240x240 Reticle Viewfinder */}
      <View className="relative w-60 h-60">
        {/* Top-Left Corner */}
        <View className="absolute top-0 left-0 w-8 h-8 border-t-[3.5px] border-l-[3.5px] border-brand-500 rounded-tl-xl" />
        {/* Top-Right Corner */}
        <View className="absolute top-0 right-0 w-8 h-8 border-t-[3.5px] border-r-[3.5px] border-brand-500 rounded-tr-xl" />
        {/* Bottom-Left Corner */}
        <View className="absolute bottom-0 left-0 w-8 h-8 border-b-[3.5px] border-l-[3.5px] border-brand-500 rounded-bl-xl" />
        {/* Bottom-Right Corner */}
        <View className="absolute bottom-0 right-0 w-8 h-8 border-b-[3.5px] border-r-[3.5px] border-brand-500 rounded-br-xl" />

        {/* Laser Scanner Line */}
        {scanning && (
          <Animated.View
            style={[
              styles.laser,
              {
                transform: [{ translateY: laserAnim }],
              },
            ]}
          />
        )}

        {/* Center Target Icon */}
        <View className="absolute inset-0 items-center justify-center opacity-30">
          <Icon name="ScanLine" size={48} color="#FFFFFF" strokeWidth={1.5} />
        </View>
      </View>

      {instructionText ? (
        <Typography
          variant="caption"
          className="text-white/70 text-center mt-6 px-8 font-medium"
        >
          {instructionText}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  laser: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
});
