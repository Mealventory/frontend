import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Avatar, Icon, Typography } from "@/src/components/atoms";
import { EmptyState } from "@/src/components/molecules/EmptyState";
import { useAuth } from "@/src/context/AuthContext";
import { useInventory } from "@/src/context/InventoryContext";
import { APP_GUTTER } from "@/src/lib/layout";
import { getHouseholdMembers, type Member } from "@/src/lib/householdApi";
import {
  ACTIVITY_ACTION_FILTERS,
  activityActorInitials,
  activityActorOptions,
  filterActivityEvents,
  type ActivityActionFilter,
} from "@/src/lib/activityFilters";
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
  const [members, setMembers] = useState<Member[]>([]);
  const [actionFilter, setActionFilter] = useState<ActivityActionFilter>("all");
  const [actorFilter, setActorFilter] = useState("all");
  const requestSequence = useRef(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const activeItemIds = useMemo(
    () => new Set(inventory.map((item) => item.id)),
    [inventory],
  );

  const actors = useMemo(() => activityActorOptions(events, members), [events, members]);
  const actorById = useMemo(
    () => new Map(actors.map((actor) => [actor.userId, actor])),
    [actors],
  );
  const filteredEvents = useMemo(
    () => filterActivityEvents(events, actionFilter, actorFilter),
    [events, actionFilter, actorFilter],
  );
  const clearFilters = () => {
    setActionFilter("all");
    setActorFilter("all");
  };

  const load = useCallback(async (refresh = false) => {
    const requestId = ++requestSequence.current;
    if (!session?.access_token || !household?.id) {
      setEvents([]);
      setMembers([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      // Load optional member profile images independently so a slow/unavailable
      // members endpoint never delays the recent activity list.
      void getHouseholdMembers(household.id, session.access_token)
        .then((rows) => {
          if (requestId === requestSequence.current) setMembers(rows);
        })
        .catch(() => {
          if (requestId === requestSequence.current) setMembers([]);
        });
      const result = await fetchHouseholdActivity(
        session.access_token,
        household.id,
        100,
      );
      if (requestId !== requestSequence.current) return;
      setEvents(result);
    } catch (e) {
      if (requestId !== requestSequence.current) return;
      setError(e instanceof Error ? e.message : "Could not load household activity.");
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [household?.id, session?.access_token]);

  useEffect(() => {
    clearFilters();
    setEvents([]);
    setMembers([]);
    void load();
    return () => {
      requestSequence.current += 1;
    };
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

      {!loading && !error && events.length > 0 && (
        <View className="pb-3" style={{ paddingHorizontal: APP_GUTTER }}>
          <View className="flex-row justify-between items-center mb-2">
            <Typography variant="caption" color="muted">Filter by action</Typography>
            {(actionFilter !== "all" || actorFilter !== "all") && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Clear activity filters"
                onPress={clearFilters}
              >
                <Typography variant="caption" color="brand">Clear filters</Typography>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {ACTIVITY_ACTION_FILTERS.map(({ value, label }) => {
              const selected = actionFilter === value;
              return (
                <TouchableOpacity
                  key={value}
                  testID={`activity-action-${value}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Filter activity by ${label}`}
                  onPress={() => setActionFilter(value)}
                  className={`mr-2 px-3 py-2 rounded-full border ${
                    selected ? "bg-brand-500 border-brand-500" : "bg-ground-surface border-border-default"
                  }`}
                >
                  <Typography variant="caption" className={selected ? "text-white" : "text-text-secondary"}>
                    {label}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Typography variant="caption" color="muted" className="mt-3 mb-2">
            Filter by member
          </Typography>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
            {[{ userId: "all", name: "All members" }, ...actors].map((actor) => {
              const selected = actorFilter === actor.userId;
              return (
                <TouchableOpacity
                  key={actor.userId}
                  testID={`activity-member-${actor.userId}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Filter activity by ${actor.name}`}
                  onPress={() => setActorFilter(actor.userId)}
                  className={`mr-2 px-3 py-2 rounded-full border ${
                    selected ? "bg-brand-500 border-brand-500" : "bg-ground-surface border-border-default"
                  }`}
                >
                  <Typography variant="caption" className={selected ? "text-white" : "text-text-secondary"}>
                    {actor.name}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <Typography variant="caption" color="muted" className="mt-3">
            {filteredEvents.length} of {events.length} recent activities. Showing up to 100 latest events.
          </Typography>
        </View>
      )}

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
          data={filteredEvents}
          keyExtractor={(event) => event.id}
          contentContainerStyle={{
            paddingHorizontal: APP_GUTTER,
            paddingBottom: 36,
            flexGrow: filteredEvents.length === 0 ? 1 : undefined,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
            />
          }
          ListEmptyComponent={
            events.length === 0 ? (
              <EmptyState
                icon="History"
                title="No household activity yet"
                description="Pantry and shopping changes from household members will show up here."
              />
            ) : (
              <EmptyState
                icon="Search"
                title="No matching activity"
                description="No recent events match those filters. Try another action or member."
                actionLabel="Clear filters"
                onAction={clearFilters}
              />
            )
          }
          renderItem={({ item: event }) => {
            const actor = actorById.get(event.actor_user_id);
            const actorName = actor?.name || event.actor_name || "Household member";
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
                    ? `${actorName} ${activityDescription(event)}. Open item`
                    : undefined
                }
                onPress={() => openEvent(event)}
                className="flex-row items-center py-4 border-b border-border-default"
              >
                <View className="relative w-[46px] h-[46px] mr-3">
                  <Avatar
                    uri={actor?.avatarUrl || undefined}
                    initials={activityActorInitials(actorName)}
                    size="md"
                    className="rounded-full"
                  />
                  <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border border-border-default bg-ground-surface items-center justify-center">
                    <Icon name={actionIcon(event.action)} size={11} color="#10B981" />
                  </View>
                </View>
                <View className="flex-1 min-w-0">
                  <Typography numberOfLines={2}>
                    <Typography className="font-bold">
                      {actorName}
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
