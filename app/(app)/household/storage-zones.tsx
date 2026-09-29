import React from "react";
import { View } from "react-native";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { Typography, Badge } from "@/src/components/atoms";

const zones = [
  { name: "Pantry", emoji: "🥫", count: 18, desc: "Ambient dry foods & canned goods" },
  { name: "Refrigerator", emoji: "❄️", count: 12, desc: "Fresh produce, dairy & meats" },
  { name: "Freezer", emoji: "🧊", count: 7, desc: "Frozen items & long-term storage" },
  { name: "Spice Rack", emoji: "🧂", count: 24, desc: "Seasonings & cooking oils" },
];

export default function StorageZonesScreen() {
  return (
    <RoutePlaceholder
      title="Storage Zones"
      category="Household"
      routePath="/(app)/household/storage-zones"
      description="Define storage locations within your home to categorize foods by storage temperature and shelf life."
      iconName="Layers"
      showBackToHome={false}
    >
      <View className="gap-3">
        {zones.map((zone) => (
          <View
            key={zone.name}
            className="flex-row items-center p-4 bg-ground-card rounded-2xl border border-border-default shadow-sm"
          >
            <Typography variant="h2" className="mr-3">
              {zone.emoji}
            </Typography>
            <View className="flex-1">
              <Typography variant="body" className="font-bold">
                {zone.name}
              </Typography>
              <Typography variant="caption" color="muted">
                {zone.desc}
              </Typography>
            </View>
            <Badge label={`${zone.count} items`} variant="neutral" size="sm" />
          </View>
        ))}
      </View>
    </RoutePlaceholder>
  );
}
