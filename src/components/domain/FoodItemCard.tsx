import React from "react";
import { TouchableOpacity, View, Text } from "react-native";
import { expiryDays, expiryLabel, localDay } from '@/src/lib/pantryExpiry';
import { FoodItem } from "@/src/types";
import { ItemPhoto } from "./ItemPhoto";

export interface FoodItemCardProps {
  item: FoodItem;
  today?: string;
  onPress: (item: FoodItem) => void;
  className?: string;
  quantityControls?: React.ReactNode;
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

export function FoodItemCard({ item, onPress, className = "", today = localDay(), quantityControls }: FoodItemCardProps) {
  const days = item.expiryDate === undefined ? (Number.isFinite(item.daysLeft) ? item.daysLeft : null) : expiryDays(item.expiryDate, today);
  const expiryStyle = days === null ? {text:'text-text-muted',bg:'bg-ground-subtle',border:'border-border-default'} : getExpiryStyle(days);
  const daysLabel = expiryLabel(days);

  return (
    <View
      className={`flex-row items-center p-3.5 bg-ground-surface dark:bg-ground-card rounded-[20px] border border-border-default shadow-sm ${className}`}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${item.quantity}, ${daysLabel}. Open item details`}
        activeOpacity={0.7}
        onPress={() => onPress(item)}
        className="flex-1 min-w-0 min-h-[44px] flex-row items-center"
      >
      {/* Item icon and title */}
      <View className={quantityControls ? "mr-2" : "mr-3.5"}>
        <ItemPhoto
          imageRef={item.imageRef}
          emoji={item.emoji}
          name={item.name}
          size={quantityControls ? 32 : 46}
          borderRadius={16}
          emojiSize={24}
        />
      </View>

      {/* Item info */}
      <View className="flex-1 min-w-0 mr-3">
        <Text
          numberOfLines={quantityControls ? 2 : 1}
          className="text-[15px] font-bold text-text-primary tracking-tight font-bold"
        >
          {item.name}
        </Text>
        <Text className="text-[12px] leading-[18px] font-regular text-text-muted mt-1">
          {`${item.quantity} · ${item.category}`}
        </Text>
      </View>

      </TouchableOpacity>

      {quantityControls}

      {/* Expiry remains a separate detail target, outside the quantity buttons. */}
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${item.name}: ${daysLabel}. Open item details`} onPress={() => onPress(item)} className="items-end justify-center min-h-[44px] shrink-0 max-w-[86px] ml-4">
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
      </TouchableOpacity>
    </View>
  );
}
