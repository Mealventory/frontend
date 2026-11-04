import { useMemo } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { Badge, Button, Typography } from "@/src/components/atoms";
import { Icon } from "@/src/components/atoms/Icon";
import { useInventory } from "@/src/context/InventoryContext";
import { expiryDays, expiryLabel, localDay, pantryView } from "@/src/lib/pantryExpiry";
import type { StorageZone } from "@/src/types";

const zones: Array<{
  id: StorageZone;
  name: string;
  emoji: string;
  desc: string;
}> = [
  { id: "pantry", name: "Pantry", emoji: "🥫", desc: "Ambient dry foods & canned goods" },
  { id: "fridge", name: "Refrigerator", emoji: "❄️", desc: "Fresh produce, dairy & meats" },
  { id: "freezer", name: "Freezer", emoji: "🧊", desc: "Frozen items & long-term storage" },
  { id: "spicerack", name: "Spice Rack", emoji: "🧂", desc: "Seasonings & cooking oils" },
];

export default function StorageZonesScreen() {
  const router = useRouter();
  const { inventory, inventoryLoading, inventoryError, refreshInventory } = useInventory();
  const today = localDay();

  const summaries = useMemo(
    () =>
      zones.map((zone) => {
        const view = pantryView(inventory, today, zone.id);
        const urgentItems = view.items
          .filter((item) => expiryDays(item.expiryDate, today) !== null)
          .slice(0, 3);

        return {
          ...zone,
          itemCount: view.items.length,
          expiringSoonCount: view.counts.today + view.counts.soon,
          urgentItems,
        };
      }),
    [inventory, today]
  );

  const openZone = (zone: StorageZone) => {
    router.push({
      pathname: "/(app)/(tabs)",
      params: { zone },
    } as any);
  };

  return (
    <RoutePlaceholder
      title="Storage Zones"
      category="Household"
      routePath="/(app)/household/storage-zones"
      description="See what is stored in each part of your kitchen and jump straight into a filtered pantry view."
      iconName="Layers"
      showBackToHome={false}
    >
      {inventoryError ? (
        <View className="gap-3 p-4 bg-ground-card rounded-2xl border border-border-default">
          <Typography variant="body" className="font-bold">
            Could not refresh storage zones
          </Typography>
          <Typography variant="caption" color="muted">
            {inventoryError}
          </Typography>
          <Button label="Try again" variant="outline" onPress={() => void refreshInventory()} />
        </View>
      ) : inventoryLoading && inventory.length === 0 ? (
        <View className="py-8 items-center">
          <ActivityIndicator accessibilityLabel="Loading storage zones" color="#10B981" />
        </View>
      ) : (
        <View className="gap-4">
          {summaries.map((zone) => (
            <View
              key={zone.id}
              className="p-4 bg-ground-card rounded-2xl border border-border-default shadow-sm"
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Open ${zone.name}, ${zone.itemCount} ${zone.itemCount === 1 ? "item" : "items"}, ${zone.expiringSoonCount} expiring soon`}
                onPress={() => openZone(zone.id)}
                className="gap-4"
              >
                <View className="flex-row items-start gap-3">
                  <View className="w-12 h-12 rounded-xl bg-ground-subtle items-center justify-center">
                    <Typography variant="h2">{zone.emoji}</Typography>
                  </View>

                  <View className="flex-1">
                    <View className="flex-row items-center justify-between gap-3">
                      <Typography variant="body" className="font-bold">
                        {zone.name}
                      </Typography>
                      <Icon name="ChevronRight" size={18} color="#94A3B8" />
                    </View>
                    <Typography variant="caption" color="muted" className="mt-1">
                      {zone.desc}
                    </Typography>
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  <Badge
                    label={`${zone.itemCount} ${zone.itemCount === 1 ? "item" : "items"}`}
                    variant="neutral"
                    size="sm"
                  />
                  <Badge
                    label={`${zone.expiringSoonCount} expiring soon`}
                    variant={zone.expiringSoonCount > 0 ? "soon" : "fresh"}
                    size="sm"
                    showDot
                  />
                </View>

                {zone.itemCount === 0 ? (
                  <View className="p-3 rounded-xl bg-ground-subtle">
                    <Typography variant="caption" color="muted">
                      Nothing stored here yet.
                    </Typography>
                  </View>
                ) : zone.urgentItems.length > 0 ? (
                  <View className="gap-2 p-3 rounded-xl bg-ground-subtle">
                    <Typography variant="tiny" color="muted" className="font-bold uppercase">
                      Needs attention
                    </Typography>
                    {zone.urgentItems.map((item) => {
                      const days = expiryDays(item.expiryDate, today);
                      return (
                        <View key={item.id} className="flex-row items-center justify-between gap-3">
                          <Typography variant="caption" className="flex-1 font-semibold" numberOfLines={1}>
                            {item.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={days !== null && days <= 0 ? "critical" : "secondary"}
                          >
                            {expiryLabel(days)}
                          </Typography>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View className="p-3 rounded-xl bg-ground-subtle">
                    <Typography variant="caption" color="muted">
                      No dated items need attention right now.
                    </Typography>
                  </View>
                )}
              </TouchableOpacity>

              {zone.itemCount === 0 && (
                <Button
                  label={`Add item to ${zone.name}`}
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  leadingIcon={<Icon name="Plus" size={16} />}
                  onPress={() => router.push("/(modal)/manual-add" as any)}
                />
              )}
            </View>
          ))}
        </View>
      )}
    </RoutePlaceholder>
  );
}
