import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon, Typography } from "@/src/components/atoms";
import { EmptyState } from "@/src/components/molecules/EmptyState";
import { useAuth } from "@/src/context/AuthContext";
import { useInventory } from "@/src/context/InventoryContext";
import { APP_GUTTER } from "@/src/lib/layout";
import {
  activityDescription,
  fetchHouseholdActivity,
  relativeActivityTime,
  type ActivityAction,
  type HouseholdActivityEvent,
} from "@/src/lib/activityApi";

function actionIcon(action: ActivityAction) {
  if (action === "shopping_added") return "ShoppingBasket" as const;
  if (action === "consumed") return "CircleCheck" as const;
  if (action === "discarded" || action === "deleted") return "Trash2" as const;
  if (action === "moved") return "Move" as const;
  if (action === "updated") return "Pencil" as const;
  return "Plus" as const;
}

export default function HouseholdActivityScreen() {
  const router = useRouter();
  const { session, household } = useAuth();
  const { inventory, openItem } = useInventory();
  const [events, setEvents] = useState<HouseholdActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const activeItemIds = useMemo(
    () => new Set(inventory.map((item) => item.id)),
    [inventory],
  );

  const load = useCallback(async (refresh = false) => {
    if (!session?.access_token || !household?.id) {
      setEvents([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const result = await fetchHouseholdActivity(
        session.access_token,
        household.id,
      );
      setEvents(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load household activity.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [household?.id, session?.access_token]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEvent = (event: HouseholdActivityEvent) => {
    if (
      event.entity_type !== "inventory" ||
      !event.entity_id ||
      !activeItemIds.has(event.entity_id)
    ) {
      return;
    }
    const item = inventory.find((candidate) => candidate.id === event.entity_id);
    if (!item) return;
    openItem(item);
    router.push(`/(app)/inventory/${item.id}` as any);
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-ground-canvas"
    >
      <View className="flex-row items-center px-4 pt-2 pb-4">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to kitchen"
          onPress={() => router.back()}
          className="w-11 h-11 rounded-xl border border-border-default bg-ground-surface items-center justify-center"
        >
          <Icon name="ChevronLeft" size={21} />
        </TouchableOpacity>
        <View className="flex-1 ml-3">
          <Typography variant="h2">Household Activity</Typography>
          <Typography variant="caption" color="muted">
            {household?.name || "Selected household"}
          </Typography>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
          <Typography variant="caption" color="muted" className="mt-3">
            Loading activity…
          </Typography>
        </View>
      ) : error ? (
        <View className="px-4">
          <EmptyState
            icon="WifiOff"
            title="Could not load activity"
            description={error}
            actionLabel="Try again"
            onAction={() => void load()}
          />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(event) => event.id}
          contentContainerStyle={{
            paddingHorizontal: APP_GUTTER,
            paddingBottom: 36,
            flexGrow: events.length === 0 ? 1 : undefined,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="History"
              title="No household activity yet"
              description="Pantry and shopping changes from household members will show up here."
            />
          }
          renderItem={({ item: event }) => {
            const canOpen =
              event.entity_type === "inventory" &&
              Boolean(event.entity_id) &&
              activeItemIds.has(event.entity_id!);
            return (
              <TouchableOpacity
                activeOpacity={canOpen ? 0.7 : 1}
                disabled={!canOpen}
                accessibilityRole={canOpen ? "button" : undefined}
                accessibilityLabel={
                  canOpen
                    ? `${event.actor_name} ${activityDescription(event)}. Open item`
                    : undefined
                }
                onPress={() => openEvent(event)}
                className="flex-row items-center py-4 border-b border-border-default"
              >
                <View className="w-10 h-10 rounded-xl bg-ground-subtle dark:bg-ground-elevated items-center justify-center">
                  <Icon
                    name={actionIcon(event.action)}
                    size={18}
                    color="#10B981"
                  />
                </View>
                <View className="flex-1 min-w-0 ml-3">
                  <Typography numberOfLines={2}>
                    <Typography className="font-bold">
                      {event.actor_name}
                    </Typography>
                    {" "}{activityDescription(event)}
                  </Typography>
                  <Typography variant="caption" color="muted" className="mt-1">
                    {relativeActivityTime(event.created_at)}
                  </Typography>
                </View>
                {canOpen && (
                  <Icon name="ChevronRight" size={18} color="#94A3B8" />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
