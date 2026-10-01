import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Typography, Button, Icon, Checkbox } from "@/src/components/atoms";
import { EmptyState } from "@/src/components/molecules/EmptyState";
import { useAuth } from "@/src/context/AuthContext";
import {
  addShoppingItem,
  clearCheckedShoppingItems,
  listShoppingItems,
  updateShoppingItem,
  type ShoppingItem,
} from "@/src/lib/shoppingApi";

function quantityLabel(item: ShoppingItem) {
  const quantity = Number(item.quantity);
  if (!Number.isFinite(quantity) || (quantity === 1 && item.unit === "units")) {
    return item.name;
  }
  const display = Number.isInteger(quantity)
    ? String(quantity)
    : String(quantity).replace(/0+$/, "").replace(/\.$/, "");
  return `${item.name} · ${display} ${item.unit}`;
}

export default function ShoppingTabScreen() {
  const { session, household } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [customItem, setCustomItem] = useState("");
  const [adding, setAdding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!session || !household) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setItems(await listShoppingItems(session.access_token, household.id));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not load the shopping list."
      );
    } finally {
      setLoading(false);
    }
  }, [household?.id, session?.access_token, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load])
  );

  const toggleItem = async (item: ShoppingItem) => {
    if (!session || !household || busyId) return;
    setBusyId(item.id);
    setError("");
    const previous = items;
    const optimistic = { ...item, checked: !item.checked };
    setItems((current) =>
      current.map((row) => (row.id === item.id ? optimistic : row))
    );
    try {
      const updated = await updateShoppingItem(
        session.access_token,
        household.id,
        item.id,
        { checked: !item.checked }
      );
      setItems((current) =>
        current.map((row) => (row.id === item.id ? updated : row))
      );
    } catch (e) {
      setItems(previous);
      setError(
        e instanceof Error ? e.message : "Could not update the shopping item."
      );
    } finally {
      setBusyId(null);
    }
  };

  const addCustom = async () => {
    const name = customItem.trim();
    if (!session || !household || !name || adding) return;
    setAdding(true);
    setError("");
    try {
      const existing = items.find(
        (item) => item.name.trim().toLowerCase() === name.toLowerCase()
      );
      if (existing) {
        setError("That item is already on your shopping list.");
        return;
      }
      const added = await addShoppingItem(
        session.access_token,
        household.id,
        name
      );
      setItems((current) => [...current, added]);
      setCustomItem("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not add the shopping item."
      );
    } finally {
      setAdding(false);
    }
  };

  const clearChecked = async () => {
    if (!session || !household || clearing) return;
    setClearing(true);
    setError("");
    try {
      await clearCheckedShoppingItems(session.access_token, household.id);
      setItems((current) => current.filter((item) => !item.checked));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not clear picked-up items."
      );
    } finally {
      setClearing(false);
    }
  };

  const checked = items.filter((item) => item.checked).length;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-ground-canvas"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
      >
        <View className="mb-6">
          <Typography variant="h1">Shopping List</Typography>
          <Typography variant="caption" color="muted">
            Shared with your household and ready for missing recipe ingredients
          </Typography>
        </View>

        <View className="rounded-[24px] bg-brand-50 dark:bg-brand-500/10 p-5 mb-5 border border-brand-500/20">
          <View className="flex-row items-center gap-3 mb-3">
            <Icon name="ShoppingBasket" size={24} color="#10B981" />
            <View className="flex-1">
              <Typography variant="h3">
                A little list, a fuller kitchen
              </Typography>
              <Typography color="muted" variant="caption">
                {checked} of {items.length} picked up
              </Typography>
            </View>
          </View>
          <View className="h-1.5 rounded-full bg-ground-surface overflow-hidden">
            <View
              className="h-full bg-brand-500 rounded-full"
              style={{
                width: `${
                  items.length ? (checked / items.length) * 100 : 0
                }%`,
              }}
            />
          </View>
        </View>

        {!!error && (
          <View
            accessibilityRole="alert"
            className="mb-4 p-3.5 rounded-xl bg-urgency-critical-bg border border-urgency-critical/30"
          >
            <Typography variant="caption" className="text-urgency-critical">
              {error}
            </Typography>
          </View>
        )}

        {loading ? (
          <View key="shopping-loading" className="items-center py-12 gap-3">
            <ActivityIndicator size="large" color="#10B981" />
            <Typography variant="caption" color="muted">
              Loading shopping list…
            </Typography>
          </View>
        ) : items.length === 0 ? (
          <EmptyState
            icon="ShoppingBasket"
            title="Your shopping list is clear"
            description="Add something below, or send missing ingredients here from a saved recipe."
          />
        ) : (
          <View
            key="shopping-items"
            className="p-4 bg-ground-card rounded-2xl border border-border-default mb-5 gap-3"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 }}
          >
            {items.map((item) => (
              <View
                key={item.id}
                style={{ opacity: busyId === item.id ? 0.55 : 1 }}
              >
                <Checkbox
                  checked={item.checked}
                  label={quantityLabel(item)}
                  onToggle={() => void toggleItem(item)}
                  className="py-1"
                />
              </View>
            ))}
          </View>
        )}

        <View className="p-4 bg-ground-surface dark:bg-ground-card rounded-2xl border border-border-default gap-3">
          <Typography variant="body" className="font-bold">
            Add an item
          </Typography>
          <View className="flex-row gap-2 items-center">
            <View className="flex-1 min-h-[48px] px-3.5 rounded-xl border border-border-default bg-ground-canvas justify-center">
              <TextInput
                accessibilityLabel="Custom shopping item"
                value={customItem}
                onChangeText={setCustomItem}
                onSubmitEditing={() => void addCustom()}
                returnKeyType="done"
                placeholder="e.g. Garlic"
                placeholderTextColor="#94A3B8"
                className="text-text-primary py-3"
              />
            </View>
            <Button
              label="Add"
              variant="primary"
              loading={adding}
              disabled={!customItem.trim() || adding || !household}
              onPress={() => void addCustom()}
            />
          </View>
        </View>

        {checked > 0 && (
          <Button
            label={clearing ? "Clearing…" : "Clear Picked Up"}
            variant="ghost"
            loading={clearing}
            onPress={() => void clearChecked()}
            className="mt-3"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
