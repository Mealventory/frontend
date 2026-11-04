import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/src/context/AuthContext";
import {
  fetchHouseholdActivity,
  HouseholdActivityEvent,
} from "@/src/lib/activityApi";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function AnalyticsScreen() {
  const { session, household } = useAuth();

  const today = new Date();

  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [showMonths, setShowMonths] = useState(false);
  const [events, setEvents] = useState<HouseholdActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadActivity = useCallback(async (isRefresh = false) => {
    if (!session?.access_token || !household?.id) {
      setEvents([]);
      setLoading(false);
      setRefreshing(false);
      setError(
        !session ? "Please sign in to view analytics." : "Choose a household to view analytics."
      );
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const result = await fetchHouseholdActivity(
        session.access_token,
        household.id,
        100
      );

      setEvents(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load analytics. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.access_token, household?.id]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const monthEvents = useMemo(() => {
    return events.filter((event) => {
      if (event.entity_type !== "inventory") return false;
      if (event.action !== "consumed" && event.action !== "discarded") {
        return false;
      }

      const date = new Date(event.created_at);

      return (
        Number.isFinite(date.getTime()) &&
        date.getMonth() === selectedMonth &&
        date.getFullYear() === selectedYear
      );
    });
  }, [events, selectedMonth, selectedYear]);

  const consumedCount = monthEvents.filter(
    (event) => event.action === "consumed"
  ).length;

  const wastedCount = monthEvents.filter(
    (event) => event.action === "discarded"
  ).length;

  const totalTracked = consumedCount + wastedCount;

  const wasteReasons = [
  { key: "expired", label: "Expired" },
  { key: "spoiled", label: "Spoiled" },
  { key: "bought_too_much", label: "Bought too much" },
  { key: "didnt_like", label: "Didn't like it" },
  { key: "other", label: "Other" },
] as const;

const wasteReasonCounts = wasteReasons.map((reason) => ({
  ...reason,
  count: monthEvents.filter(
    (event) =>
      event.action === "discarded" && event.reason === reason.key
  ).length,
}));

const unclassifiedWasteCount = monthEvents.filter(
  (event) => event.action === "discarded" && !event.reason
).length;

  const consumptionPercentage =
    totalTracked > 0
      ? Math.round((consumedCount / totalTracked) * 100)
      : 0;

  const wastePercentage =
    totalTracked > 0
      ? Math.round((wastedCount / totalTracked) * 100)
      : 0;

  const selectMonth = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    setShowMonths(false);
  };

  const changeYear = (amount: number) => {
    setSelectedYear((year) => year + amount);
  };

  return (
      <SafeAreaView className="flex-1 bg-[#7DB59F]" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadActivity(true)}
          />
        }
      >
        <View className="mb-6">
          <Text className="text-3xl font-bold text-text-primary">
            Waste Analytics
          </Text>
          <Text className="mt-2 text-text-muted">
            Understand your household's consumption and food waste.
          </Text>
        </View>

        <View className="mb-5 flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => changeYear(-1)}
            accessibilityLabel="Previous year"
            className="rounded-xl border border-border-default px-4 py-3"
          >
            <Text className="text-lg text-text-primary">‹</Text>
          </TouchableOpacity>

          <View className="items-center">
            <TouchableOpacity
              onPress={() => setShowMonths((visible) => !visible)}
              className="rounded-xl border border-border-default px-4 py-3"
              accessibilityRole="button"
            >
              <Text className="font-semibold text-text-primary">
                {MONTHS[selectedMonth]} ⌄
              </Text>
            </TouchableOpacity>
            <Text className="mt-2 text-sm text-text-muted">
              {selectedYear}
            </Text>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => changeYear(1)}
            disabled={
              selectedYear > today.getFullYear() ||
              (selectedYear === today.getFullYear() &&
                selectedMonth >= today.getMonth())
            }
            accessibilityLabel="Next year"
            className="rounded-xl border border-border-default px-4 py-3"
          >
            <Text className="text-lg text-text-primary">›</Text>
          </TouchableOpacity>
        </View>

        {showMonths && (
          <View className="mb-5 flex-row flex-wrap gap-2">
            {MONTHS.map((month, index) => (
              <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Select ${month} ${selectedYear}`}
                key={month}
                onPress={() => selectMonth(index)}
                className={`rounded-xl border px-3 py-2 ${
                  selectedMonth === index
                    ? "border-brand-500 bg-brand-500"
                    : "border-border-default"
                }`}
              >
                <Text
                  className={
                    selectedMonth === index
                      ? "font-semibold text-white"
                      : "text-text-primary"
                  }
                >
                  {month.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!!error && (
          <View className="mb-5 rounded-2xl border border-border-default p-4">
            <Text className="font-semibold text-text-primary">
              Unable to load analytics
            </Text>
            <Text className="mt-2 text-text-muted">{error}</Text>
            <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Retry loading analytics"
              onPress={() => void loadActivity()}
              className="mt-3 self-start rounded-xl bg-brand-500 px-4 py-3"
            >
              <Text className="font-semibold text-white">Try again</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" />
            <Text className="mt-3 text-text-muted">
              Loading your household activity...
            </Text>
          </View>
        ) : (
          <>
            <View className="mb-5 flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-border-default bg-ground-surface p-4">
                <Text className="text-sm text-text-muted">
                  Items consumed
                </Text>
                <Text className="mt-3 text-3xl font-bold text-text-primary">
                  {consumedCount}
                </Text>
                <Text className="mt-1 text-sm text-text-muted">
                  {MONTHS[selectedMonth]}
                </Text>
              </View>

              <View className="flex-1 rounded-2xl border border-border-default bg-ground-surface p-4">
                <Text className="text-sm text-text-muted">
                  Items wasted
                </Text>
                <Text className="mt-3 text-3xl font-bold text-text-primary">
                  {wastedCount}
                </Text>
                <Text className="mt-1 text-sm text-text-muted">
                  {MONTHS[selectedMonth]}
                </Text>
              </View>
            </View>

            <View className="mb-5 rounded-2xl border border-border-default bg-ground-surface p-5">
              <Text className="text-lg font-bold text-text-primary">
                Consumption vs. waste
              </Text>

              <Text className="mt-2 text-sm text-text-muted">
                Based on recorded consumption and discard events.
              </Text>

              {totalTracked > 0 ? (
                <>
                  <View className="mt-5 h-4 flex-row overflow-hidden rounded-full bg-border-default">
                    {consumedCount > 0 && (
                      <View
                        style={{ flex: consumedCount }}
                        className="bg-brand-500"
                      />
                    )}
                    {wastedCount > 0 && (
                      <View
                        style={{ flex: wastedCount }}
                        className="bg-orange-400"
                      />
                    )}
                  </View>

                  <View className="mt-5 gap-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View className="h-3 w-3 rounded-full bg-brand-500" />
                        <Text className="text-text-primary">
                          Consumed
                        </Text>
                      </View>
                      <Text className="font-semibold text-text-primary">
                        {consumptionPercentage}%
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View className="h-3 w-3 rounded-full bg-orange-400" />
                        <Text className="text-text-primary">
                          Wasted
                        </Text>
                      </View>
                      <Text className="font-semibold text-text-primary">
                        {wastePercentage}%
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View className="items-center py-8">
                  <Text className="text-center font-semibold text-text-primary">
                    No recorded activity for this month
                  </Text>
                  <Text className="mt-2 text-center text-text-muted">
                    Mark an inventory item as consumed or discarded to start
                    building your analytics.
                  </Text>
                </View>
              )}
            </View>

            <View className="mb-5 rounded-2xl border border-border-default bg-ground-surface p-5">
  <Text className="text-lg font-bold text-text-primary">
    Waste breakdown
  </Text>

  <Text className="mt-2 text-text-muted">
    {wastedCount === 0
      ? "No discarded items have been recorded for this month."
      : `${wastedCount} item${wastedCount === 1 ? "" : "s"} discarded this month.`}
  </Text>

  {wastedCount > 0 && (
    <View className="mt-4 gap-4">
      {wasteReasonCounts.map((reason) => (
        <View key={reason.key} className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-text-primary">
              {reason.label}
            </Text>
            <Text className="text-sm font-semibold text-text-primary">
              {reason.count}
            </Text>
          </View>

          <View className="h-2 overflow-hidden rounded-full bg-border-default">
            <View
              className="h-full rounded-full bg-[#7DB59F]"
              style={{
                width: `${(reason.count / wastedCount) * 100}%`,
              }}
            />
          </View>
        </View>
      ))}

      {unclassifiedWasteCount > 0 && (
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-text-muted">
              Not specified
            </Text>
            <Text className="text-sm font-semibold text-text-primary">
              {unclassifiedWasteCount}
            </Text>
          </View>

          <View className="h-2 overflow-hidden rounded-full bg-border-default">
            <View
              className="h-full rounded-full bg-[#A3A3A3]"
              style={{
                width: `${(unclassifiedWasteCount / wastedCount) * 100}%`,
              }}
            />
          </View>
        </View>
      )}
    </View>
  )}
</View>

            <View className="rounded-2xl border border-border-default bg-ground-surface p-5">
              <Text className="text-lg font-bold text-text-primary">
                Activity summary
              </Text>
              <Text className="mt-2 text-sm text-text-muted">
                Recorded inventory events for {MONTHS[selectedMonth]}{" "}
                {selectedYear}.
              </Text>

              {monthEvents.length === 0 ? (
                <Text className="mt-4 text-text-muted">
                  Nothing to display yet.
                </Text>
              ) : (
                <View className="mt-4 gap-4">
                  {monthEvents.map((event) => (
                    <View
                      key={event.id}
                      className="flex-row items-center justify-between gap-3"
                    >
                      <View className="flex-1">
                        <Text className="font-semibold text-text-primary">
                          {event.item_name}
                        </Text>
                        <Text className="mt-1 text-sm text-text-muted">
                          {event.action === "consumed"
                            ? "Consumed"
                            : "Discarded"}
                        </Text>
                      </View>

                      <Text className="text-sm text-text-muted">
                        {new Date(event.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <Text className="mt-5 text-center text-xs text-text-muted">
              Analytics are calculated from your household's recorded activity.
              This screen uses the 100 most recent activity events returned by
              the API, so older months may not include every event.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}