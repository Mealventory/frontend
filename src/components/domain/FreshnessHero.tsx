import { View, Text } from "react-native";
import { FoodItem } from "@/src/types";
import { ItemPhoto } from "./ItemPhoto";

export interface FreshnessHeroProps {
  item: FoodItem;
}

export function FreshnessHero({ item }: FreshnessHeroProps) {
  const isUrgent = item.daysLeft <= 1;
  const isWarn = !isUrgent && item.daysLeft <= 3;

  const bgClass = isUrgent
    ? "bg-urgency-critical-bg"
    : isWarn
    ? "bg-urgency-soon-bg"
    : "bg-urgency-fresh-bg";

  const textClass = isUrgent
    ? "text-urgency-critical"
    : isWarn
    ? "text-urgency-soon"
    : "text-urgency-fresh";

  const borderClass = isUrgent
    ? "border-urgency-critical/30"
    : isWarn
    ? "border-urgency-soon/30"
    : "border-urgency-fresh/30";

  const expLabel =
    item.expiryDate === null ? 'Expiration date unknown' : item.daysLeft === 0
      ? "Expires today"
      : item.daysLeft === 1
      ? "Expires tomorrow"
      : `${item.daysLeft} days left`;

  return (
    <View
      className={`items-center p-8 rounded-[28px] border ${bgClass} ${borderClass} mb-4`}
    >
      <View className="mb-4">
        <ItemPhoto
          imageRef={item.imageRef}
          emoji={item.emoji}
          name={item.name}
          size={176}
          borderRadius={28}
          emojiSize={72}
        />
      </View>
      <Text className="text-[22px] font-bold text-text-primary text-center">
        {item.name}
      </Text>
      <Text className="text-[14px] font-regular text-text-muted mt-1 text-center">
        {item.quantity} · {item.category}
      </Text>

      <View className="mt-4 px-4 py-2 bg-ground-surface dark:bg-ground-elevated rounded-full border border-border-default shadow-sm">
        <Text className={`text-[14px] font-bold ${textClass}`}>
          {expLabel}
        </Text>
      </View>
    </View>
  );
}
