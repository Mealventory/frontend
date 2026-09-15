import React from "react";
import { View, Text, Image } from "react-native";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  uri?: string;
  emoji?: string;
  initials?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeConfig: Record<AvatarSize, { container: string; text: string; image: number }> = {
  sm: { container: "w-8 h-8 rounded-lg", text: "text-sm", image: 32 },
  md: { container: "w-[46px] h-[46px] rounded-xl", text: "text-2xl", image: 46 },
  lg: { container: "w-[60px] h-[60px] rounded-2xl", text: "text-3xl", image: 60 },
  xl: { container: "w-[76px] h-[76px] rounded-3xl", text: "text-4xl", image: 76 },
};

export function Avatar({
  uri,
  emoji = "🥦",
  initials,
  size = "md",
  className = "",
}: AvatarProps) {
  const config = sizeConfig[size];

  return (
    <View
      className={`items-center justify-center bg-ground-subtle border border-border-default overflow-hidden ${config.container} ${className}`}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: config.image, height: config.image }}
          resizeMode="cover"
        />
      ) : initials ? (
        <Text className={`font-bold text-text-primary ${config.text}`}>
          {initials}
        </Text>
      ) : (
        <Text className={config.text}>{emoji}</Text>
      )}
    </View>
  );
}
