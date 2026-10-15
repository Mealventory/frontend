import { View, Text } from "react-native";

export interface FreshnessMeterProps {
  daysLeft: number;
}

export function FreshnessMeter({ daysLeft }: FreshnessMeterProps) {
  const freshPct = Math.max(
    5,
    Math.min(100, Math.round((Math.min(daysLeft, 30) / 30) * 100))
  );

  const textColor =
    freshPct > 50
      ? "text-brand-500"
      : freshPct > 20
      ? "text-urgency-soon"
      : "text-urgency-critical";

  const barColor =
    freshPct > 50
      ? "bg-brand-500"
      : freshPct > 20
      ? "bg-urgency-soon"
      : "bg-urgency-critical";

  return (
    <View className="p-4 bg-ground-surface dark:bg-ground-card rounded-[22px] border border-border-default shadow-sm mb-4">
      <View className="flex-row items-center justify-between mb-2.5">
        <Text className="text-[14px] font-bold text-text-primary">
          Freshness
        </Text>
        <Text className={`text-[14px] font-bold ${textColor}`}>
          {freshPct}%
        </Text>
      </View>
      <View className="h-2 bg-ground-subtle dark:bg-ground-elevated rounded-full overflow-hidden">
        <View
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${freshPct}%` }}
        />
      </View>
    </View>
  );
}
