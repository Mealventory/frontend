import React from "react";
import { View, Text } from "react-native";
import { UrgencyStatus } from "@/src/types";

export interface ExpiryIndicatorProps {
  daysLeft: number;
  expDate?: string;
  size?: "sm" | "md";
  showDate?: boolean;
  className?: string;
}

export function getUrgencyStatus(daysLeft: number): UrgencyStatus {
  if (daysLeft <= 1) return "critical";
  if (daysLeft <= 3) return "soon";
  return "fresh";
}

export function formatExpiryLabel(daysLeft: number): string {
  if (daysLeft < 0) return "Expired";
  if (daysLeft === 0) return "Today";
  if (daysLeft === 1) return "1 day";
  return `${daysLeft}d left`;
}

const statusBadgeStyles: Record<UrgencyStatus, { container: string; text: string }> = {
  critical: {
    container: "bg-urgency-critical-bg border border-urgency-critical/30",
    text: "text-urgency-critical",
  },
  soon: {
    container: "bg-urgency-soon-bg border border-urgency-soon/30",
    text: "text-urgency-soon",
  },
  fresh: {
    container: "bg-urgency-fresh-bg border border-urgency-fresh/30",
    text: "text-urgency-fresh",
  },
  frozen: {
    container: "bg-urgency-frozen-bg border border-urgency-frozen/30",
    text: "text-urgency-frozen",
  },
};

export function ExpiryIndicator({
  daysLeft,
  expDate,
  size = "sm",
  showDate = false,
  className = "",
}: ExpiryIndicatorProps) {
  const status = getUrgencyStatus(daysLeft);
  const styles = statusBadgeStyles[status];
  const label = formatExpiryLabel(daysLeft);

  const containerPadding = size === "sm" ? "px-2.5 py-0.5 rounded-full" : "px-3.5 py-1.5 rounded-full";
  const textSize = size === "sm" ? "text-[11px]" : "text-[13px]";

  return (
    <View className={`items-end ${className}`}>
      <View className={`flex-row items-center ${containerPadding} ${styles.container}`}>
        <Text className={`font-bold ${textSize} ${styles.text}`}>
          {label}
        </Text>
      </View>
      {showDate && expDate && (
        <Text className="text-[11px] font-medium text-text-muted mt-1">
          {expDate}
        </Text>
      )}
    </View>
  );
}
