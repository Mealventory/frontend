import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, Icon, Typography } from "@/src/components/atoms";
import { EmptyState } from "@/src/components/molecules/EmptyState";
import { useAuth } from "@/src/context/AuthContext";
import {
  loadScanHistory,
  scanModeLabel,
  summarizeScanItems,
  type ScanHistoryEntry,
} from "@/src/lib/scanHistory";

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Recently";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

export default function ScanHistoryScreen() {
  const router = useRouter();
  const { session, household } = useAuth();
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
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
    if (!scope) {
      setHistory([]);
      setLoading(false);
      return () => {
        active = false;
      };
    }
    void loadScanHistory(scope).then((entries) => {
      if (!active) return;
      setHistory(entries);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [scope]);

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-ground-canvas"
    >
      <View className="flex-row items-center px-5 pt-2 pb-4">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to scanner"
          className="w-11 h-11 rounded-2xl bg-ground-surface border border-border-default items-center justify-center"
        >
          <Icon name="ChevronLeft" size={21} />
        </Pressable>
        <View className="flex-1 ml-3">
          <Typography variant="h2">Recent Scans</Typography>
          <Typography variant="caption" color="muted">
            {household?.name || "Selected household"}
          </Typography>
        </View>
        <Button
          label="Scan"
          size="sm"
          leadingIcon={<Icon name="ScanLine" size={15} color="#FFFFFF" />}
          onPress={() => router.push("/(modal)/scanner" as any)}
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
          <Typography color="muted" className="mt-3">
            Loading scan history...
          </Typography>
        </View>
      ) : history.length === 0 ? (
        <ScrollView contentContainerStyle={{ padding: 20 }}>
          <EmptyState
            icon="History"
            title="No scans yet"
            description="Product, receipt, tag, and barcode scans will appear here after you use the scanner."
            actionLabel="Start a Scan"
            onAction={() => router.push("/(modal)/scanner" as any)}
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        >
          <View className="gap-3">
            {history.map((entry) => {
              const failed = entry.status === "failed";
              return (
                <Pressable
                  key={entry.id}
                  onPress={() =>
                    router.push({
                      pathname: "/(app)/scan-history/[id]",
                      params: { id: entry.id },
                    } as any)
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`${scanModeLabel(entry.mode)} scan, ${failed ? "failed" : "successful"}`}
                  className="rounded-3xl border border-border-default bg-ground-surface p-4"
                >
                  <View className="flex-row items-start">
                    <View
                      className={`w-11 h-11 rounded-2xl items-center justify-center ${
                        failed
                          ? "bg-danger-500/10"
                          : "bg-brand-500/10"
                      }`}
                    >
                      <Icon
                        name={failed ? "CircleAlert" : "ScanLine"}
                        size={21}
                        color={failed ? "#EF4444" : "#10B981"}
                      />
                    </View>

                    <View className="flex-1 ml-3">
                      <View className="flex-row items-center justify-between gap-2">
                        <Typography variant="h3">
                          {scanModeLabel(entry.mode)}
                        </Typography>
                        <Typography variant="caption" color="muted">
                          {relativeTime(entry.createdAt)}
                        </Typography>
                      </View>

                      <Typography
                        color="muted"
                        className={failed ? "mt-1 text-danger-500" : "mt-1"}
                        numberOfLines={2}
                      >
                        {failed
                          ? entry.error || "Scan failed."
                          : summarizeScanItems(entry.items)}
                      </Typography>

                      <View className="flex-row items-center mt-3">
                        <View
                          className={`rounded-full px-2.5 py-1 ${
                            failed
                              ? "bg-danger-500/10"
                              : "bg-brand-500/10"
                          }`}
                        >
                          <Typography
                            variant="caption"
                            className={
                              failed
                                ? "text-danger-500"
                                : "text-brand-600 dark:text-brand-400"
                            }
                          >
                            {failed ? "Failed" : "Successful"}
                          </Typography>
                        </View>
                        <Typography variant="caption" color="muted" className="ml-2">
                          {entry.items.length} {entry.items.length === 1 ? "item" : "items"}
                        </Typography>
                      </View>
                    </View>

                    <View className="ml-2 pt-2">
                      <Icon name="ChevronRight" size={19} color="#94A3B8" />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
