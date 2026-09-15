import React from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { FoodItem } from "@/src/types";

export interface FoodItemCardProps {
  item: FoodItem;
  onPress: (item: FoodItem) => void;
  className?: string;
}

function getExpiryStyle(days: number) {
  if (days <= 1) {
    return {
      text: "text-urgency-critical",
      bg: "bg-urgency-critical-bg",
      border: "border-urgency-critical/30",
    };
  }
  if (days <= 3) {
    return {
      text: "text-urgency-soon",
      bg: "bg-urgency-soon-bg",
      border: "border-urgency-soon/30",
    };
  }
  return {
    text: "text-urgency-fresh",
    bg: "bg-urgency-fresh-bg",
    border: "border-urgency-fresh/30",
  };
}

function getDaysLabel(days: number): string {
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  return `${days}d`;
}

export function FoodItemCard({ item, onPress, className = "" }: FoodItemCardProps) {
  const expiryStyle = getExpiryStyle(item.daysLeft);
  const daysLabel = getDaysLabel(item.daysLeft);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(item)}
      className={`flex-row items-center p-3.5 bg-ground-surface dark:bg-ground-card rounded-[20px] border border-border-default shadow-sm ${className}`}
    >
      {/* 46x46 Emoji Box */}
      <View className="w-[46px] h-[46px] rounded-[16px] bg-ground-subtle dark:bg-ground-elevated items-center justify-center mr-3.5">
        <Text className="text-2xl">{item.emoji}</Text>
      </View>

      {/* Item info */}
      <View className="flex-1 min-w-0 mr-3">
        <Text
          numberOfLines={1}
          className="text-[15px] font-bold text-text-primary tracking-tight font-bold"
        >
          {item.name}
        </Text>
        <Text className="text-[12px] font-regular text-text-muted mt-0.5">
          {item.quantity} · {item.category}
        </Text>
      </View>

      {/* Expiry Pill & Date */}
      <View className="items-end">
        <View
          className={`px-2.5 py-0.5 rounded-full border ${expiryStyle.bg} ${expiryStyle.border}`}
        >
          <Text className={`text-[12px] font-bold ${expiryStyle.text}`}>
            {daysLabel}
          </Text>
        </View>
        <Text className="text-[11px] font-medium text-text-subtle mt-1 font-regular">
          {item.expDate}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
