import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Icon, Typography } from "@/src/components/atoms";
import { EmptyState } from "@/src/components/molecules/EmptyState";
import { useAuth } from "@/src/context/AuthContext";
import {
  getScanHistoryEntry,
  scanModeLabel,
  type ScanHistoryEntry,
} from "@/src/lib/scanHistory";

export default function ScanHistoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { session, household } = useAuth();
  const [entry, setEntry] = useState<ScanHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const scope = useMemo(
    () =>
      session?.user.id && household?.id
        ? { userId: session.user.id, householdId: household.id }
        : null,
    [session?.user.id, household?.id],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!scope || !params.id) {
      setEntry(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }
    void getScanHistoryEntry(scope, params.id).then((result) => {
      if (!active) return;
      setEntry(result);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [scope, params.id]);

  const scanAgain = () => {
    router.push("/(modal)/scanner" as any);
  };

  const addAgain = () => {
    if (!entry || entry.status !== "success" || entry.items.length === 0) return;
    router.push({
      pathname: "/(modal)/ai-review",
      params: {
        items: JSON.stringify(entry.items),
        mode: entry.mode,
        barcode: entry.barcode || undefined,
        historyReplay: "1",
      },
    } as any);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas items-center justify-center">
        <ActivityIndicator size="large" color="#10B981" />
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas">
        <View className="px-5 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Recent Scans"
            onPress={() => router.back()}
            className="w-11 h-11 rounded-2xl bg-ground-surface border border-border-default items-center justify-center"
          >
            <Icon name="ChevronLeft" size={21} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <EmptyState
            icon="History"
            title="Scan not found"
            description="This scan is no longer available in your recent history."
            actionLabel="Back to Recent Scans"
            onAction={() => router.back()}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const failed = entry.status === "failed";
  const createdAt = new Date(entry.createdAt);
  const timestamp = Number.isFinite(createdAt.getTime())
    ? createdAt.toLocaleString()
    : "Recent scan";

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-ground-canvas"
    >
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to recent scans"
          className="w-11 h-11 rounded-2xl bg-ground-surface border border-border-default items-center justify-center"
        >
          <Icon name="ChevronLeft" size={21} />
        </Pressable>
        <View className="flex-1 ml-3">
          <Typography variant="h2">{scanModeLabel(entry.mode)} Scan</Typography>
          <Typography variant="caption" color="muted">
            {timestamp}
          </Typography>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <View
          className={`rounded-3xl border p-5 ${
            failed
              ? "border-danger-500/30 bg-danger-500/5"
              : "border-brand-500/20 bg-brand-500/5"
          }`}
        >
          <View className="flex-row items-center">
            <View
              className={`w-12 h-12 rounded-2xl items-center justify-center ${
                failed ? "bg-danger-500/10" : "bg-brand-500/10"
              }`}
            >
              <Icon
                name={failed ? "CircleAlert" : "CircleCheck"}
                size={24}
                color={failed ? "#EF4444" : "#10B981"}
              />
            </View>
            <View className="flex-1 ml-3">
              <Typography variant="h3">
                {failed ? "Scan failed" : "Scan completed"}
              </Typography>
              <Typography variant="caption" color="muted" className="mt-1">
                {failed
                  ? "Nothing was added automatically."
                  : `${entry.items.length} ${entry.items.length === 1 ? "item" : "items"} detected`}
              </Typography>
            </View>
          </View>

          {failed && (
            <View className="mt-4 rounded-2xl bg-ground-surface border border-danger-500/20 p-4">
              <Typography variant="caption" className="text-danger-500 mb-1">
                Original error
              </Typography>
              <Typography>{entry.error || "Scan failed."}</Typography>
            </View>
          )}
        </View>

        {!failed && (
          <View className="mt-5">
            <Typography variant="h3" className="mb-3">
              Detected Items
            </Typography>
            <View className="gap-3">
              {entry.items.map((item, index) => (
                <View
                  key={`${entry.id}-item-${index}`}
                  className="rounded-2xl border border-border-default bg-ground-surface p-4"
                >
                  <View className="flex-row items-start">
                    <View className="w-10 h-10 rounded-xl bg-brand-500/10 items-center justify-center">
                      <Icon name="Package" size={19} color="#10B981" />
                    </View>
                    <View className="flex-1 ml-3">
                      <Typography variant="h3">{item.name}</Typography>
                      <Typography variant="caption" color="muted" className="mt-1">
                        {item.quantity} {item.unit}
                        {item.category ? ` · ${item.category}` : ""}
                      </Typography>
                      {item.expiry_date && (
                        <Typography variant="caption" color="muted" className="mt-1">
                          Expiry: {item.expiry_date}
                        </Typography>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="mt-6 gap-3">
          {!failed && entry.items.length > 0 && (
            <Button
              label="Add Again"
              leadingIcon={<Icon name="Plus" size={18} color="#FFFFFF" />}
              onPress={addAgain}
            />
          )}
          <Button
            label={failed ? "Retry Scan" : "Scan Again"}
            variant={failed ? "primary" : "secondary"}
            leadingIcon={<Icon name="ScanLine" size={18} />}
            onPress={scanAgain}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
