import { ExpiryDateField } from '@/src/components/molecules/ExpiryDateField';
import { normalizeExpiryDate } from '@/src/lib/expiryDate';
import React, { useState, useMemo, useRef } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Text,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Typography, Button, Icon, Badge, Avatar, Checkbox } from "@/src/components/atoms";
import { FormField } from "@/src/components/molecules";
import { useAuth } from "@/src/context/AuthContext";
import { useInventory } from "@/src/context/InventoryContext";
import { supabase } from "@/src/lib/supabase";
import { inventoryRequest, NewItem } from "@/src/lib/inventoryApi";
import { ScannedItem } from "@/src/lib/scanApi";
import { EmptyState } from "@/src/components/molecules/EmptyState";
import { resolveScanZone } from "@/src/lib/storageZones";
import { StorageZone } from "@/src/types";

export interface ReviewItemState {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiry_date: string;
  storageZone: StorageZone;
  confidence?: number;
  confirmed: boolean;
  isEditing?: boolean;
}

export function getItemEmoji(name: string, category: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("blueberry") || lower.includes("berries")) return "🫐";
  if (lower.includes("apple")) return "🍎";
  if (lower.includes("banana")) return "🍌";
  if (lower.includes("orange") || lower.includes("lemon") || lower.includes("citrus")) return "🍊";
  if (lower.includes("chicken") || lower.includes("beef") || lower.includes("meat") || lower.includes("pork")) return "🍗";
  if (lower.includes("fish") || lower.includes("salmon") || lower.includes("shrimp") || lower.includes("seafood")) return "🐟";
  if (lower.includes("milk") || lower.includes("dairy")) return "🥛";
  if (lower.includes("yogurt")) return "🫙";
  if (lower.includes("cheese") || lower.includes("cheddar")) return "🧀";
  if (lower.includes("egg")) return "🥚";
  if (lower.includes("bread") || lower.includes("toast") || lower.includes("bakery")) return "🍞";
  if (lower.includes("tomato")) return "🍅";
  if (lower.includes("spinach") || lower.includes("lettuce") || lower.includes("salad") || lower.includes("carrot")) return "🥬";
  if (lower.includes("avocado")) return "🥑";
  if (lower.includes("pasta") || lower.includes("penne") || lower.includes("noodle")) return "🍝";
  if (lower.includes("protein") || lower.includes("shake") || lower.includes("beverage")) return "🥤";

  const catLower = category.toLowerCase();
  if (catLower.includes("produce")) return "🥦";
  if (catLower.includes("dairy")) return "🥛";
  if (catLower.includes("meat")) return "🥩";
  if (catLower.includes("bakery")) return "🥖";
  if (catLower.includes("beverage")) return "🧃";
  return "🍽️";
}

export function parseRawScanItems(rawParam?: string, rawBarcode?: string): ReviewItemState[] {
  if (rawParam) {
    try {
      const parsed = JSON.parse(rawParam);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: ScannedItem, index: number) => ({
          id: item.id || `scanned-${index}-${Date.now()}`,
          name: item.name ?? `Detected Item ${index + 1}`,
          category: item.category || "Pantry",
          quantity: typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1,
          unit: item.unit || "units",
          expiry_date: item.expiry_date || "",
          storageZone: resolveScanZone(item.storageZone, item.category || "Pantry"),
          confidence: typeof item.confidence === "number" ? item.confidence : undefined,
          confirmed: true,
          isEditing: !item.name,
        }));
      }
    } catch {
      // Fall through to rawBarcode check if json parse fails
    }
  }

  if (rawBarcode) {
    return [{
      id: `scanned-barcode-${Date.now()}`,
      name: `Barcode: ${rawBarcode}`,
      category: "Pantry",
      quantity: 1,
      unit: "units",
      expiry_date: "",
      storageZone: "pantry",
      confidence: 1.0,
      confirmed: true,
      isEditing: false,
    }];
  }

  return [];
}

export async function saveReviewedItems(
  items: ReviewItemState[],
  save: (payload: NewItem) => Promise<unknown>,
) {
  const savedIds: string[] = [];
  const errors: string[] = [];
  for (const item of items.filter(item => item.confirmed)) {
    try {
      if (!item.name.trim()) throw new Error("Enter the food name before saving.");
      await save({
        name: item.name.trim(),
        category: item.category.trim() || "Pantry",
        quantity: item.quantity,
        unit: item.unit.trim() || "units",
        expiry_date: normalizeExpiryDate(item.expiry_date),
        storage_zone: item.storageZone,
      });
      savedIds.push(item.id);
    } catch (error) {
      errors.push(item.name + ": " + (error instanceof Error ? error.message : "Failed to add"));
    }
  }
  return { savedIds, errors };
}

export default function AIReviewModal() {
  const router = useRouter();
  const { session, household } = useAuth();
  const { refreshInventory } = useInventory();
  const params = useLocalSearchParams<{ items?: string; mode?: string; barcode?: string; barcodeType?: string }>();

  // Parse items from scanner navigation route params
  const initialItems = useMemo(
    () => parseRawScanItems(params.items, params.barcode),
    [params.items, params.barcode]
  );

  const [items, setItems] = useState<ReviewItemState[]>(initialItems);
  const savingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const confirmedItems = items.filter((i) => i.confirmed);

  const handleToggleConfirm = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, confirmed: !item.confirmed } : item))
    );
  };

  const handleToggleEdit = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isEditing: !item.isEditing } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<ReviewItemState>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const getAccessToken = async (): Promise<string> => {
    if (session?.access_token) return session.access_token;
    const result = await supabase?.auth.getSession();
    if (result?.data?.session?.access_token) return result.data.session.access_token;
    throw new Error("Please sign in again.");
  };

  const handleAddToPantry = async () => {
    if (savingRef.current) return;
    if (confirmedItems.length === 0) {
      Alert.alert("No Items Selected", "Please select at least one item to add to your pantry.");
      return;
    }

    if (!household?.id) {
      setErrorMessage("Please choose a household first.");
      return;
    }

    savingRef.current = true;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const token = await getAccessToken();
      const { savedIds, errors } = await saveReviewedItems(confirmedItems,
        payload => inventoryRequest(token, household.id, "POST", undefined, payload));
      // Remove acknowledged saves before any refresh, so retry sends only failures.
      setItems(previous => previous.filter(item => !savedIds.includes(item.id)));
      setSuccessCount(previous => (previous || 0) + savedIds.length);
      if (errors.length) setErrorMessage(errors.join("\n"));
      await refreshInventory();
      if (!errors.length) router.replace("/(app)/(tabs)" as any);

    } catch (err: any) {
      setErrorMessage(err.message || "Could not save items to inventory.");
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  };

  const modeBadge = useMemo(() => {
    switch (params.mode) {
      case "barcode":
        return "Barcode scan";
      case "receipt":
        return "Receipt OCR";
      case "tag":
        return "Tag scan";
      case "food":
      default:
        return "Product AI";
    }
  }, [params.mode]);

  // Empty items state
  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas p-6">
        <View className="flex-row items-center justify-between mb-4">
          <Button
            label="Back"
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
          />
          <Badge label={modeBadge} variant="brand" showDot />
          <View className="w-12" />
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingBottom: 24 }}>
          <EmptyState icon="ScanLine" title="Ready for another look?"
            description="There are no ingredients to review yet. Try a clearer photo, or add an item yourself."
            actionLabel="Scan again" onAction={() => router.replace("/(modal)/scanner" as any)}
            secondaryLabel="Add manually" onSecondary={() => router.replace("/(modal)/manual-add" as any)} />
        </ScrollView>

        <View />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80 }}>
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-3">
          <Button
            label="Cancel"
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
          />
          <Badge label="Sample scan" variant="brand" showDot />
          <View className="w-12" />
        </View>

        <View className="mb-4">
          <Typography variant="h2" className="font-bold mb-1">
            Review {items.length > 1 ? `Items (${items.length})` : "Item"}
          </Typography>
          <Typography variant="caption" color="muted">
            Verify AI-extracted item attributes before committing to household pantry
          </Typography>
        </View>

        {/* Success Banner */}
        {successCount !== null && (
          <View className="mb-4 p-4 bg-fresh-500/15 border border-fresh-500/40 rounded-2xl flex-row items-center">
            <Icon name="CheckCircle2" size={20} color="#10B981" />
            <Typography variant="body" className="ml-2.5 font-bold text-fresh-700">
              {successCount} {successCount === 1 ? "item" : "items"} added to household pantry!
            </Typography>
          </View>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <View className="mb-4 p-4 bg-danger-500/10 border border-danger-500/30 rounded-2xl flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <Icon name="AlertCircle" size={20} color="#EF4444" />
              <Typography variant="caption" className="ml-2 text-danger-700 flex-1 font-medium">
                {errorMessage}
              </Typography>
            </View>
            <TouchableOpacity onPress={() => setErrorMessage(null)}>
              <Icon name="X" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* List of Detected Items */}
        <View className="gap-4 mb-6">
          {items.map((item) => {
            const emoji = getItemEmoji(item.name, item.category);
            const confidencePercent = item.confidence
              ? `${Math.round(item.confidence <= 1 ? item.confidence * 100 : item.confidence)}% confidence`
              : null;

            return (
              <View
                key={item.id}
                className={`p-4 bg-ground-card rounded-2xl border shadow-sm ${
                  item.confirmed ? "border-border-default" : "border-border-default/50 opacity-60"
                }`}
              >
                {/* Card Header: Checkbox + Avatar + Name + Confidence + Remove */}
                <View className="flex-row items-center">
                  <Checkbox
                    checked={item.confirmed}
                    onToggle={() => handleToggleConfirm(item.id)}
                    className="mr-3"
                  />

                  <Avatar emoji={emoji} size="md" className="mr-3" />

                  <View className="flex-1">
                    <Typography variant="h3" className="font-bold">
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="muted">
                      {item.category} · {item.quantity} {item.unit}
                    </Typography>
                  </View>

                  <View className="items-end gap-1.5 ml-2">
                    {confidencePercent && (
                      <Badge label={confidencePercent} variant="fresh" size="sm" />
                    )}

                    <View className="flex-row items-center gap-2 mt-1">
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleToggleEdit(item.id)}
                        className="p-1.5 rounded-lg bg-ground-surface border border-border-default"
                      >
                        <Icon
                          name={item.isEditing ? "ChevronUp" : "Edit3"}
                          size={14}
                          color="#64748B"
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleRemoveItem(item.id)}
                        className="p-1.5 rounded-lg bg-danger-500/10 border border-danger-500/20"
                      >
                        <Icon name="Trash2" size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Expiration date chip */}
                <View className="flex-row items-center mt-3 pt-3 border-t border-border-default/40 justify-between">
                  <View className="flex-row items-center">
                    <Icon name="Calendar" size={14} color="#94A3B8" />
                    <Typography variant="caption" color="muted" className="ml-1.5">
                      Expires: {item.expiry_date || "Not set"}
                    </Typography>
                  </View>
                  <Typography variant="caption" className="font-medium text-brand-500">
                    Zone: {item.storageZone}
                  </Typography>
                </View>

                {/* Expandable Editable Form Fields */}
                {item.isEditing && (
                  <View className="gap-3 mt-4 pt-4 border-t border-border-default">
                    <FormField
                      label="Product Name"
                      value={item.name}
                      onChangeText={(val) => handleUpdateItem(item.id, { name: val })}
                      leadingIcon={<Icon name="Tag" size={16} color="#94A3B8" />}
                    />

                    <View className="flex-row gap-2">
                      <View className="flex-1">
                        <FormField
                          label="Quantity"
                          value={String(item.quantity)}
                          keyboardType="numeric"
                          onChangeText={(val) => {
                            const num = parseFloat(val);
                            handleUpdateItem(item.id, { quantity: isNaN(num) ? 1 : num });
                          }}
                          leadingIcon={<Icon name="Hash" size={16} color="#94A3B8" />}
                        />
                      </View>
                      <View className="flex-1">
                        <FormField
                          label="Unit"
                          value={item.unit}
                          onChangeText={(val) => handleUpdateItem(item.id, { unit: val })}
                          leadingIcon={<Icon name="Package" size={16} color="#94A3B8" />}
                        />
                      </View>
                    </View>

                    <FormField
                      label="Category"
                      value={item.category}
                      onChangeText={(val) => handleUpdateItem(item.id, { category: val })}
                      leadingIcon={<Icon name="Folder" size={16} color="#94A3B8" />}
                    />

                    <ExpiryDateField value={item.expiry_date}
                      onChangeText={(val) => handleUpdateItem(item.id, { expiry_date: val })} />

                    {/* Storage Zone Selector */}
                    <View>
                      <Typography variant="caption" className="text-text-secondary font-medium mb-1.5">
                        Storage Zone
                      </Typography>
                      <View className="flex-row gap-2">
                        {(["pantry", "fridge", "freezer", "spicerack"] as StorageZone[]).map((zone) => {
                          const isSel = item.storageZone === zone;
                          return (
                            <TouchableOpacity
                              key={zone}
                              activeOpacity={0.7}
                              onPress={() => handleUpdateItem(item.id, { storageZone: zone })}
                              className={`px-3 py-1.5 rounded-xl border ${
                                isSel
                                  ? "bg-brand-500 border-brand-500"
                                  : "bg-ground-surface border-border-default"
                              }`}
                            >
                              <Text
                                className={`text-[12px] font-semibold capitalize ${
                                  isSel ? "text-white" : "text-text-secondary"
                                }`}
                              >
                                {zone}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Action Button */}
        <Button
          label={
            submitting
              ? "Saving to Pantry..."
              : confirmedItems.length > 0
              ? `Add ${confirmedItems.length} ${confirmedItems.length === 1 ? "Item" : "Items"} to Household Pantry`
              : "Select Items to Add"
          }
          variant="primary"
          size="lg"
          disabled={confirmedItems.length === 0 || submitting}
          loading={submitting}
          leadingIcon={!submitting ? <Icon name="PlusCircle" size={18} color="#FFFFFF" /> : undefined}
          onPress={handleAddToPantry}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
