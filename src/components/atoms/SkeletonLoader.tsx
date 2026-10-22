import { useEffect, useRef } from "react";
import { Animated, DimensionValue } from "react-native";
import { useAppTheme } from "@/src/context/ThemeContext";

export interface SkeletonLoaderProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  className?: string;
}

export function SkeletonLoader({
  width = "100%",
  height = 20,
  borderRadius = 8,
  className = "",
}: SkeletonLoaderProps) {
  const { isDark } = useAppTheme();
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim]);

  const bgStyle = {
    backgroundColor: isDark ? "#1E293B" : "#E2E8F0",
  };

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          opacity: opacityAnim,
        },
        bgStyle,
      ]}
      className={className}
    />
  );
}
