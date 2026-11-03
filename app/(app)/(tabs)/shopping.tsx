import { BrandLogo } from "@/src/components/atoms/BrandLogo";
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Typography, Button, Icon, Checkbox } from "@/src/components/atoms";
import { EmptyState } from "@/src/components/molecules/EmptyState";
import { SwipeActionRow } from "@/src/components/molecules/SwipeActionRow";
import { useAuth } from "@/src/context/AuthContext";
import { useInventory } from "@/src/context/InventoryContext";
import { batchCreateInventoryItems } from "@/src/lib/inventoryApi";
import { preparePurchasedInventoryItems } from "@/src/lib/shoppingPantry";
import { APP_GUTTER, APP_PAGE_TOP } from "@/src/lib/layout";
import {
  addShoppingItem,
  clearCheckedShoppingItems,
  deleteShoppingItem,
  listConsumedShoppingSuggestions,
  listShoppingItems,
  updateShoppingItem,
  type ShoppingItem,
} from "@/src/lib/shoppingApi";
import {
  addHouseholdStore,
  deleteHouseholdStore,
  listHouseholdStores,
  normalizeStoreUrl,
  reorderHouseholdStores,
  updateHouseholdStore,
  type HouseholdStore,
} from "@/src/lib/storeApi";

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

function normalizedName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export default function ShoppingTabScreen() {
  const { session, household } = useAuth();
  const { refreshInventory } = useInventory();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [stores, setStores] = useState<HouseholdStore[]>([]);
  const [storeName, setStoreName] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeBusy, setStoreBusy] = useState<string | null>(null);
  const [storeError, setStoreError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [customItem, setCustomItem] = useState("");
  const [adding, setAdding] = useState(false);
  const [addingSuggestion, setAddingSuggestion] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!session || !household) {
      setItems([]);
      setSuggestions([]);
      setStores([]);
      setStoreName("");
      setStoreUrl("");
      setEditingStoreId(null);
      setStoreError("");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setStoreError("");
      const [shopping, replenishment, householdStores] = await Promise.all([
        listShoppingItems(session.access_token, household.id),
        listConsumedShoppingSuggestions(
          session.access_token,
          household.id
        ).catch(() => []),
        listHouseholdStores(session.access_token, household.id).catch((e) => {
          setStoreError(
            e instanceof Error ? e.message : "Could not load household stores."
          );
          return [];
        }),
      ]);
      setItems(shopping);
      setSuggestions(replenishment);
      setStores(householdStores);
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

  const toBuy = useMemo(() => items.filter((item) => !item.checked), [items]);
  const purchased = useMemo(
    () => items.filter((item) => item.checked),
    [items]
  );
  const availableSuggestions = useMemo(() => {
    const onList = new Set(items.map((item) => normalizedName(item.name)));
    return suggestions.filter((name) => !onList.has(normalizedName(name)));
  }, [items, suggestions]);

  const resetStoreForm = () => {
    setStoreName("");
    setStoreUrl("");
    setEditingStoreId(null);
  };

  const saveStore = async () => {
    const name = storeName.trim();
    if (!session || !household || !name || storeBusy) return;

    const websiteUrl = storeUrl.trim() ? normalizeStoreUrl(storeUrl) : null;
    if (storeUrl.trim() && !websiteUrl) {
      setStoreError("Enter a valid http or https website URL.");
      return;
    }

    setStoreBusy(editingStoreId || "save");
    setStoreError("");
    setNotice("");
    try {
      if (editingStoreId) {
        const updated = await updateHouseholdStore(
          session.access_token,
          household.id,
          editingStoreId,
          { name, website_url: websiteUrl }
        );
        setStores((current) =>
          current.map((store) => (store.id === updated.id ? updated : store))
        );
        setNotice(`${updated.name} updated.`);
      } else {
        const added = await addHouseholdStore(
          session.access_token,
          household.id,
          name,
          websiteUrl
        );
        setStores((current) => [...current, added]);
        setNotice(`${added.name} added to your household stores.`);
      }
      resetStoreForm();
    } catch (e) {
      setStoreError(
        e instanceof Error ? e.message : "Could not save the household store."
      );
    } finally {
      setStoreBusy(null);
    }
  };

  const beginStoreEdit = (store: HouseholdStore) => {
    setEditingStoreId(store.id);
    setStoreName(store.name);
    setStoreUrl(store.website_url || "");
    setStoreError("");
  };

  const removeStore = async (store: HouseholdStore) => {
    if (!session || !household || storeBusy) return;
    setStoreBusy(store.id);
    setStoreError("");
    setNotice("");
    try {
      await deleteHouseholdStore(session.access_token, household.id, store.id);
      setStores((current) => current.filter((row) => row.id !== store.id));
      if (editingStoreId === store.id) resetStoreForm();
      setNotice(`${store.name} removed from household stores.`);
    } catch (e) {
      setStoreError(
        e instanceof Error ? e.message : "Could not remove the household store."
      );
    } finally {
      setStoreBusy(null);
    }
  };

  const moveStore = async (index: number, direction: -1 | 1) => {
    if (!session || !household || storeBusy) return;
    const target = index + direction;
    if (target < 0 || target >= stores.length) return;

    const previous = stores;
    const next = [...stores];
    [next[index], next[target]] = [next[target], next[index]];
    setStores(next);
    setStoreBusy("order");
    setStoreError("");
    try {
      const reordered = await reorderHouseholdStores(
        session.access_token,
        household.id,
        next.map((store) => store.id)
      );
      setStores(reordered);
    } catch (e) {
      setStores(previous);
      setStoreError(
        e instanceof Error ? e.message : "Could not reorder household stores."
      );
    } finally {
      setStoreBusy(null);
    }
  };

  const openStoreWebsite = async (store: HouseholdStore) => {
    if (!store.website_url) return;
    const url = normalizeStoreUrl(store.website_url);
    if (!url) {
      setStoreError("This store website URL is not valid.");
      return;
    }
    setStoreError("");
    try {
      await Linking.openURL(url);
    } catch {
      setStoreError("Could not open this store website.");
    }
  };

  const toggleItem = async (item: ShoppingItem) => {
    if (!session || !household || busyId || moving) return;
    setBusyId(item.id);
    setError("");
    setNotice("");
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

  const deleteItem = async (item: ShoppingItem) => {
    if (!session || !household || busyId || moving) return;
    setBusyId(item.id);
    setError("");
    setNotice("");
    const previous = items;
    setItems((current) => current.filter((row) => row.id !== item.id));
    try {
      await deleteShoppingItem(
        session.access_token,
        household.id,
        item.id
      );
      setNotice(`${item.name} removed from Shopping.`);
    } catch (e) {
      setItems(previous);
      setError(
        e instanceof Error ? e.message : "Could not remove the shopping item."
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
    setNotice("");
    try {
      const existing = items.find(
        (item) => normalizedName(item.name) === normalizedName(name)
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

  const addSuggestion = async (name: string) => {
    if (
      !session ||
      !household ||
      addingSuggestion ||
      addingAll ||
      items.some((item) => normalizedName(item.name) === normalizedName(name))
    ) {
      return;
    }
    setAddingSuggestion(name);
    setError("");
    setNotice("");
    try {
      const added = await addShoppingItem(
        session.access_token,
        household.id,
        name
      );
      setItems((current) => [...current, added]);
      setSuggestions((current) =>
        current.filter((suggestion) => normalizedName(suggestion) !== normalizedName(name))
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not add the suggested item."
      );
    } finally {
      setAddingSuggestion(null);
    }
  };

  const addAllSuggestions = async () => {
    if (!session || !household || addingAll || availableSuggestions.length === 0) {
      return;
    }
    setAddingAll(true);
    setError("");
    setNotice("");
    let addedCount = 0;
    try {
      for (const name of availableSuggestions) {
        const added = await addShoppingItem(
          session.access_token,
          household.id,
          name
        );
        addedCount += 1;
        setItems((current) => [...current, added]);
        setSuggestions((current) =>
          current.filter(
            (suggestion) => normalizedName(suggestion) !== normalizedName(name)
          )
        );
      }
      setNotice(
        `${addedCount} replenishment suggestion${addedCount === 1 ? "" : "s"} added to Shopping.`
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Some replenishment suggestions could not be added."
      );
    } finally {
      setAddingAll(false);
    }
  };

  const clearChecked = async () => {
    if (!session || !household || clearing || moving) return;
    setClearing(true);
    setError("");
    setNotice("");
    try {
      await clearCheckedShoppingItems(session.access_token, household.id);
      setItems((current) => current.filter((item) => !item.checked));
      setNotice("Purchased items cleared from Shopping.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not clear purchased items."
      );
    } finally {
      setClearing(false);
    }
  };

  const movePurchasedToPantry = async () => {
    if (!session || !household || moving || purchased.length === 0) return;
    setMoving(true);
    setError("");
    setNotice("");
    let inventoryCreated = false;

    try {
      const prepared = await preparePurchasedInventoryItems(
        session.access_token,
        household.id,
        purchased
      );
      const created = await batchCreateInventoryItems(
        session.access_token,
        household.id,
        prepared.items
      );
      inventoryCreated = true;
      await clearCheckedShoppingItems(session.access_token, household.id);
      setItems((current) => current.filter((item) => !item.checked));
      await refreshInventory();

      const createdCount = Array.isArray(created)
        ? created.length
        : prepared.items.length;
      const expiryNote =
        prepared.withoutExpiry > 0
          ? ` ${prepared.withoutExpiry} item${prepared.withoutExpiry === 1 ? "" : "s"} need an expiry date review.`
          : "";
      setNotice(
        `${createdCount} purchased item${createdCount === 1 ? "" : "s"} moved to My Kitchen.${expiryNote}`
      );
    } catch (e) {
      if (inventoryCreated) {
        await refreshInventory().catch(() => undefined);
        setError(
          "The items were added to My Kitchen, but Shopping could not be cleared. Use “Clear Purchased” instead of moving them again."
        );
      } else {
        setError(
          e instanceof Error
            ? e.message
            : "Could not move purchased items to My Kitchen."
        );
      }
    } finally {
      setMoving(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-ground-canvas"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: APP_GUTTER, paddingTop: APP_PAGE_TOP, paddingBottom: 32 }}
      >
        <View style={{ marginBottom: 16 }}><BrandLogo /></View>
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
                {purchased.length} of {items.length} picked up
              </Typography>
            </View>
          </View>
          <View className="h-1.5 rounded-full bg-ground-surface overflow-hidden">
            <View
              className="h-full bg-brand-500 rounded-full"
              style={{
                width: `${
                  items.length ? (purchased.length / items.length) * 100 : 0
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

        {!!notice && (
          <View
            accessibilityRole="alert"
            className="mb-4 p-3.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 border border-brand-500/25"
          >
            <Typography variant="caption" className="text-brand-700 dark:text-brand-300">
              {notice}
            </Typography>
          </View>
        )}

        <View className="mb-5 p-4 bg-ground-card rounded-2xl border border-border-default gap-4">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/15 items-center justify-center">
              <Icon name="Store" size={18} color="#10B981" />
            </View>
            <View className="flex-1">
              <Typography variant="body" className="font-bold">
                Frequently shopped stores
              </Typography>
              <Typography variant="caption" color="muted">
                Household links for quick shopping access
              </Typography>
            </View>
          </View>

          {!!storeError && (
            <View
              accessibilityRole="alert"
              className="p-3 rounded-xl bg-urgency-critical-bg border border-urgency-critical/30"
            >
              <Typography variant="caption" className="text-urgency-critical">
                {storeError}
              </Typography>
            </View>
          )}

          {stores.length === 0 ? (
            <View className="p-3 rounded-xl bg-ground-surface">
              <Typography variant="caption" color="muted">
                Save the stores your household uses most. These links will also support future Shopping features without requiring location access.
              </Typography>
            </View>
          ) : (
            <View className="gap-3">
              {stores.map((store, index) => (
                <View
                  key={store.id}
                  className="p-3 rounded-xl bg-ground-surface border border-border-default gap-2"
                  style={{ opacity: storeBusy === store.id ? 0.55 : 1 }}
                >
                  <View className="flex-row items-start gap-3">
                    <View className="flex-1">
                      <Typography variant="body" className="font-bold">
                        {store.name}
                      </Typography>
                      <Typography variant="caption" color="muted">
                        {store.website_url || "No website saved"}
                      </Typography>
                    </View>
                    {store.website_url && (
                      <Button
                        label="Visit"
                        variant="outline"
                        size="sm"
                        onPress={() => void openStoreWebsite(store)}
                      />
                    )}
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    <Button
                      label="Up"
                      variant="ghost"
                      size="sm"
                      disabled={index === 0 || Boolean(storeBusy)}
                      onPress={() => void moveStore(index, -1)}
                    />
                    <Button
                      label="Down"
                      variant="ghost"
                      size="sm"
                      disabled={index === stores.length - 1 || Boolean(storeBusy)}
                      onPress={() => void moveStore(index, 1)}
                    />
                    <Button
                      label="Edit"
                      variant="ghost"
                      size="sm"
                      disabled={Boolean(storeBusy)}
                      onPress={() => beginStoreEdit(store)}
                    />
                    <Button
                      label="Remove"
                      variant="ghost"
                      size="sm"
                      disabled={Boolean(storeBusy)}
                      onPress={() => void removeStore(store)}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          <View className="pt-3 border-t border-border-default gap-3">
            <Typography variant="caption" className="font-bold">
              {editingStoreId ? "Edit store" : "Add a store"}
            </Typography>
            <TextInput
              accessibilityLabel="Store name"
              value={storeName}
              onChangeText={setStoreName}
              placeholder="e.g. Costco"
              placeholderTextColor="#94A3B8"
              className="min-h-[48px] px-3.5 rounded-xl border border-border-default bg-ground-canvas text-text-primary"
            />
            <TextInput
              accessibilityLabel="Store website"
              value={storeUrl}
              onChangeText={setStoreUrl}
              onSubmitEditing={() => void saveStore()}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              placeholder="costco.ca (optional)"
              placeholderTextColor="#94A3B8"
              className="min-h-[48px] px-3.5 rounded-xl border border-border-default bg-ground-canvas text-text-primary"
            />
            <View className="flex-row gap-2">
              <Button
                label={editingStoreId ? "Save Changes" : "Add Store"}
                className="flex-1"
                loading={storeBusy === "save" || storeBusy === editingStoreId}
                disabled={!storeName.trim() || Boolean(storeBusy)}
                onPress={() => void saveStore()}
              />
              {editingStoreId && (
                <Button
                  label="Cancel"
                  variant="ghost"
                  disabled={Boolean(storeBusy)}
                  onPress={resetStoreForm}
                />
              )}
            </View>
          </View>
        </View>

        {availableSuggestions.length > 0 && (
          <View className="mb-5 p-4 bg-ground-card rounded-2xl border border-border-default gap-3">
            <View className="flex-row items-center gap-3">
              <Icon name="RefreshCw" size={18} color="#10B981" />
              <View className="flex-1">
                <Typography variant="body" className="font-bold">
                  Recently consumed
                </Typography>
                <Typography variant="caption" color="muted">
                  Re-add household staples with one tap
                </Typography>
              </View>
              <Button
                label="Add All"
                variant="ghost"
                loading={addingAll}
                disabled={addingAll || Boolean(addingSuggestion)}
                onPress={() => void addAllSuggestions()}
              />
            </View>
            <View className="flex-row flex-wrap gap-2">
              {availableSuggestions.map((name) => (
                <Button
                  key={name}
                  label={name}
                  variant="outline"
                  loading={addingSuggestion === name}
                  disabled={addingAll || Boolean(addingSuggestion)}
                  onPress={() => void addSuggestion(name)}
                />
              ))}
            </View>
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
            className="p-4 bg-ground-card rounded-2xl border border-border-default mb-5 gap-4"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 1,
              elevation: 1,
            }}
          >
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Typography variant="body" className="font-bold">To Buy</Typography>
                <Typography variant="caption" color="muted">
                  {toBuy.length}
                </Typography>
              </View>
              {toBuy.length === 0 ? (
                <Typography variant="caption" color="muted">
                  Everything on the list has been picked up.
                </Typography>
              ) : (
                toBuy.map((item) => (
                  <SwipeActionRow
                    key={item.id}
                    disabled={moving || Boolean(busyId)}
                    testIDPrefix={`shopping-swipe-${item.id}`}
                    actions={[
                      {
                        key: "purchased",
                        label: "Purchased",
                        accessibilityLabel: `Mark ${item.name} as purchased`,
                        onPress: () => toggleItem(item),
                      },
                      {
                        key: "delete",
                        label: "Delete",
                        accessibilityLabel: `Delete ${item.name} from Shopping`,
                        tone: "danger",
                        onPress: () => deleteItem(item),
                      },
                    ]}
                  >
                    <View
                      className="bg-ground-card"
                      style={{ opacity: busyId === item.id ? 0.55 : 1 }}
                    >
                      <Checkbox
                        checked={false}
                        label={quantityLabel(item)}
                        disabled={moving || Boolean(busyId)}
                        onToggle={() => void toggleItem(item)}
                        className="py-1"
                      />
                    </View>
                  </SwipeActionRow>
                ))
              )}
            </View>

            {purchased.length > 0 && (
              <View className="pt-3 border-t border-border-default">
                <View className="flex-row items-center justify-between mb-2">
                  <Typography variant="body" className="font-bold">Purchased</Typography>
                  <Typography variant="caption" color="muted">
                    {purchased.length}
                  </Typography>
                </View>
                {purchased.map((item) => (
                  <SwipeActionRow
                    key={item.id}
                    disabled={moving || Boolean(busyId)}
                    testIDPrefix={`shopping-swipe-${item.id}`}
                    actions={[
                      {
                        key: "to-buy",
                        label: "To Buy",
                        accessibilityLabel: `Move ${item.name} back to To Buy`,
                        onPress: () => toggleItem(item),
                        tone: "neutral",
                      },
                      {
                        key: "delete",
                        label: "Delete",
                        accessibilityLabel: `Delete ${item.name} from Shopping`,
                        tone: "danger",
                        onPress: () => deleteItem(item),
                      },
                    ]}
                  >
                    <View
                      className="bg-ground-card"
                      style={{ opacity: busyId === item.id ? 0.55 : 1 }}
                    >
                      <Checkbox
                        checked
                        label={quantityLabel(item)}
                        disabled={moving || Boolean(busyId)}
                        onToggle={() => void toggleItem(item)}
                        className="py-1"
                      />
                    </View>
                  </SwipeActionRow>
                ))}
              </View>
            )}
          </View>
        )}

        {purchased.length > 0 && (
          <View className="mb-5 gap-2">
            <Button
              label={
                moving
                  ? "Moving Purchased…"
                  : `Move ${purchased.length} Purchased to Pantry`
              }
              variant="primary"
              loading={moving}
              disabled={moving || clearing}
              onPress={() => void movePurchasedToPantry()}
            />
            <Button
              label="Clear Purchased"
              variant="ghost"
              loading={clearing}
              disabled={moving || clearing}
              onPress={() => void clearChecked()}
            />
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
      </ScrollView>
    </SafeAreaView>
  );
}
