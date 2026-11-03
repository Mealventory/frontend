import { View, Text } from "react-native";
import { UrgencyStatus } from "@/src/types";

export type BadgeVariant = UrgencyStatus | "neutral" | "brand";
export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  showDot?: boolean;
  className?: string;
}

const variantContainerStyles: Record<BadgeVariant, string> = {
  critical: "bg-urgency-critical-bg border border-urgency-critical/30",
  soon: "bg-urgency-soon-bg border border-urgency-soon/30",
  fresh: "bg-urgency-fresh-bg border border-urgency-fresh/30",
  frozen: "bg-urgency-frozen-bg border border-urgency-frozen/30",
  brand: "bg-brand-50 border border-brand-500/20 dark:bg-brand-500/20",
  neutral: "bg-ground-subtle border border-border-default",
};

const variantTextStyles: Record<BadgeVariant, string> = {
  critical: "text-urgency-critical",
  soon: "text-urgency-soon",
  fresh: "text-urgency-fresh",
  frozen: "text-urgency-frozen",
  brand: "text-brand-500",
  neutral: "text-text-secondary",
};

const dotColors: Record<BadgeVariant, string> = {
  critical: "bg-urgency-critical",
  soon: "bg-urgency-soon",
  fresh: "bg-urgency-fresh",
  frozen: "bg-urgency-frozen",
  brand: "bg-brand-500",
  neutral: "bg-text-secondary",
};

export function Badge({
  label,
  variant = "neutral",
  size = "sm",
  showDot = false,
  className = "",
}: BadgeProps) {
  const containerSize =
    size === "sm" ? "px-2.5 py-1 rounded-full" : "px-3.5 py-1.5 rounded-full";
  const textSize = size === "sm" ? "text-[11px] font-bold" : "text-[13px] font-bold";

  return (
    <View
      className={`flex-row items-center self-start justify-center ${containerSize} ${variantContainerStyles[variant]} ${className}`}
    >
      {showDot && (
        <View
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColors[variant]}`}
        />
      )}
      <Text className={`${textSize} ${variantTextStyles[variant]}`}>
        {label}
      </Text>
    </View>
  );
}
