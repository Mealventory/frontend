import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Platform } from "react-native";
import { Typography } from "../atoms/Typography";
import { Icon } from "../atoms/Icon";

export interface BarcodeScannerFrameProps {
  scanning?: boolean;
  instructionText?: string;
  className?: string;
  mode?: "food" | "receipt" | "barcode" | "tag";
}

export function BarcodeScannerFrame({
  scanning = false,
  instructionText = "Align barcode or item inside the frame",
  className = "",
  mode = "food",
}: BarcodeScannerFrameProps) {
  const laserAnim = useRef(new Animated.Value(0)).current;

  // For barcode mode, keep laser active so user knows it's live auto-scanning; for other modes, animate while scanning
  const isLaserActive = mode === "barcode" || scanning;

  const getDimensions = () => {
    switch (mode) {
      case "receipt":
        return { width: 270, height: 370, laserTravel: 350 };
      case "barcode":
        return { width: 290, height: 170, laserTravel: 155 };
      case "tag":
        return { width: 280, height: 140, laserTravel: 125 };
      case "food":
      default:
        return { width: 260, height: 260, laserTravel: 240 };
    }
  };

  const { width, height, laserTravel } = getDimensions();

  useEffect(() => {
    if (isLaserActive) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: laserTravel,
            duration: mode === "barcode" ? 1400 : 1200,
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: mode === "barcode" ? 1400 : 1200,
            useNativeDriver: Platform.OS !== "web",
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      laserAnim.setValue(laserTravel / 2);
    }
  }, [isLaserActive, laserTravel, mode, laserAnim]);

  return (
    <View className={`items-center justify-center ${className}`}>
      {/* Viewfinder Container */}
      <View
        style={{ width, height }}
        className="relative items-center justify-center"
      >
        {/* Corner Brackets */}
        <View className="absolute top-0 left-0 w-8 h-8 border-t-[3.5px] border-l-[3.5px] border-brand-500 rounded-tl-2xl" />
        <View className="absolute top-0 right-0 w-8 h-8 border-t-[3.5px] border-r-[3.5px] border-brand-500 rounded-tr-2xl" />
        <View className="absolute bottom-0 left-0 w-8 h-8 border-b-[3.5px] border-l-[3.5px] border-brand-500 rounded-bl-2xl" />
        <View className="absolute bottom-0 right-0 w-8 h-8 border-b-[3.5px] border-r-[3.5px] border-brand-500 rounded-br-2xl" />

        {/* Receipt Document Guidelines */}
        {mode === "receipt" && (
          <View className="absolute inset-x-6 inset-y-8 border border-white/20 rounded-lg justify-around py-4">
            <View className="h-[1px] bg-white/10 mx-4" />
            <View className="h-[1px] bg-white/10 mx-4" />
            <View className="h-[1px] bg-white/10 mx-4" />
            <View className="h-[1px] bg-white/10 mx-4" />
          </View>
        )}

        {/* Laser Scanner Line */}
        {isLaserActive && (
          <Animated.View
            style={[
              styles.laser,
              {
                transform: [{ translateY: laserAnim }],
              },
            ]}
          />
        )}

        {/* Center Target Watermark Icon */}
        <View className="absolute inset-0 items-center justify-center opacity-25">
          {mode === "barcode" && (
            <Icon name="Barcode" size={56} color="#FFFFFF" strokeWidth={1.5} />
          )}
          {mode === "receipt" && (
            <Icon name="Receipt" size={52} color="#FFFFFF" strokeWidth={1.5} />
          )}
          {mode === "food" && (
            <Icon name="Apple" size={52} color="#FFFFFF" strokeWidth={1.5} />
          )}
          {mode === "tag" && (
            <Icon name="Tag" size={48} color="#FFFFFF" strokeWidth={1.5} />
          )}
        </View>
      </View>

      {/* Instruction Badge */}
      {instructionText ? (
        <View className="mt-6 px-5 py-2 rounded-full bg-black/60 border border-white/15 max-w-[85%]">
          <Typography
            variant="caption"
            className="text-white text-center font-medium"
          >
            {instructionText}
          </Typography>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  laser: {
    position: "absolute",
    top: 6,
    left: 10,
    right: 10,
    height: 2.5,
    backgroundColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 5,
  },
});
