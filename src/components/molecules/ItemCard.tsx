import { TouchableOpacity, View } from "react-native";
import { FoodItem } from "@/src/types";
import { Avatar } from "../atoms/Avatar";
import { Typography } from "../atoms/Typography";
import { ExpiryIndicator } from "./ExpiryIndicator";

export interface ItemCardProps {
  item: FoodItem;
  onPress?: (item: FoodItem) => void;
  className?: string;
}

export function ItemCard({ item, onPress, className = "" }: ItemCardProps) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.quantity}, ${item.category}. Open item`}
      activeOpacity={0.7}
      onPress={() => onPress?.(item)}
      className={`flex-row items-center p-3.5 bg-ground-card rounded-2xl border border-border-default shadow-sm ${className}`}
    >
      <Avatar emoji={item.emoji} size="md" className="mr-3.5" />

      <View className="flex-1 min-w-0 mr-3">
        <Typography
          variant="body"
          className="font-bold text-[15px] truncate"
          numberOfLines={2}
        >
          {item.name}
        </Typography>
        <Typography variant="caption" color="muted" className="mt-0.5">
          {item.quantity} · {item.category}
        </Typography>
      </View>

      <ExpiryIndicator
        daysLeft={item.daysLeft}
        expDate={item.expDate}
        showDate
      />
    </TouchableOpacity>
  );
}
