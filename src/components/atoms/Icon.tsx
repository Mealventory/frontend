import React from "react";
import * as LucideIcons from "lucide-react-native";
import { useAppTheme } from "@/src/context/ThemeContext";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";
export type IconName = keyof typeof LucideIcons;

export interface IconProps {
  name: IconName;
  size?: IconSize | number;
  color?: string | any;
  strokeWidth?: number;
  className?: string;
}

const sizeMap: Record<IconSize, number> = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
};

export function Icon({
  name,
  size = "md",
  color,
  strokeWidth = 2,
}: IconProps) {
  const { isDark } = useAppTheme();
  const IconComponent = (LucideIcons[name] as unknown as React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>) || LucideIcons.HelpCircle;

  const resolvedSize = typeof size === "number" ? size : sizeMap[size] || 22;
  const defaultColor = color || (isDark ? "#F8FAFC" : "#0F172A");

  return (
    <IconComponent
      size={resolvedSize}
      color={defaultColor}
      strokeWidth={strokeWidth}
    />
  );
}
