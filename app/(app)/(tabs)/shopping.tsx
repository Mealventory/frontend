import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography, Button, Icon, Checkbox } from '@/src/components/atoms';
import { useAuth } from '@/src/context/AuthContext';
import shoppingApi, { type ShoppingRow } from '@/src/lib/shoppingApi';
import { batchCreateInventoryItems, type NewItem } from '@/src/lib/inventoryApi';
import { predictExpiry } from '@/src/lib/expiryPredictionApi';
import { defaultScanZone } from '@/src/lib/storageZones';

export default function ShoppingTabScreen() {
  const { session, household } = useAuth();
  const [items, setItems] = useState<ShoppingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const token = session?.access_token ?? '';
  const householdId = household?.id ?? '';

  const refresh = async () => {
    if (!token || !householdId) return;
    setLoading(true);
    try {
      const list = await shoppingApi.listShopping(token, householdId);
      setItems(list);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, [token, householdId]);

  useEffect(() => {
    // Load recently consumed items for quick-add suggestions
    if (!token || !householdId) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const base = (process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
        if (!base) return;
        const resp = await fetch(`${base}/api/v1/items?status=consumed&limit=6`, { headers: { Authorization: `Bearer ${token}`, 'X-Household-ID': householdId }, signal: controller.signal });
        if (!resp.ok) return;
        const rows = await resp.json();
        setSuggestions(Array.from(new Set(rows.map((r: any) => r.name))).slice(0, 6));
      } catch (err) { /* ignore */ }
    })();
    return () => controller.abort();
  }, [token, householdId]);

  const toBuy = useMemo(() => items.filter(i => !i.checked), [items]);
  const purchased = useMemo(() => items.filter(i => i.checked), [items]);

  const toggleItem = async (id: string, checked: boolean) => {
    if (!token || !householdId) return;
    // optimistic update
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked } : i));
    try {
      await shoppingApi.updateShoppingItem(token, householdId, id, { checked });
    } catch (err) {
      console.error(err); await refresh();
    }
  };

  const addSuggestion = async (name: string) => {
    if (!token || !householdId) return;
    try {
      await shoppingApi.addShoppingItem(token, householdId, { name, quantity: 1, unit: 'units' });
      await refresh();
    } catch (err) { console.error(err); }
  };

  const movePurchasedToPantry = async () => {
    if (!token || !householdId) return;
    const toMove = items.filter(i => i.checked);
    if (!toMove.length) return Alert.alert('No purchased items', 'Check items you bought first.');
    try {
      setLoading(true);
      // For each purchased shopping item, predict expiry and prepare NewItem
      const controller = new AbortController();
      const newItems: NewItem[] = [];
      for (const s of toMove) {
        const qty = Number(s.quantity) || 1;
        const zone = defaultScanZone(s.name || '');
        let expiry: string | null = null;
        try {
          const pred = await predictExpiry(token, householdId, { name: s.name, storage_zone: zone, purchase_date: new Date().toISOString().split('T')[0] }, controller.signal);
          expiry = pred?.predicted_expiry_date ?? null;
        } catch (e) {
          // ignore prediction error, proceed without expiry
        }
        newItems.push({ name: s.name, category: 'Pantry', quantity: qty, unit: s.unit || 'units', expiry_date: expiry, storage_zone: zone });
      }
      const created = await batchCreateInventoryItems(token, householdId, newItems);
      // if successful, clear checked shopping rows
      await shoppingApi.clearCheckedShopping(token, householdId);
      Alert.alert('Moved to pantry', `${created.length} items added to your pantry.`);
      await refresh();
    } catch (err) {
      console.error(err); Alert.alert('Could not move items', String(err));
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-ground-canvas">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
        <View className="mb-6">
          <Typography variant="h1">Shopping List</Typography>
          <Typography variant="caption" color="muted">Auto-populated from low pantry stock & missing recipe ingredients</Typography>
        </View>

        <View className="rounded-[24px] bg-brand-50 dark:bg-brand-500/10 p-5 mb-5 border border-brand-500/20">
          <View className="flex-row items-center gap-3 mb-3">
            <Icon name="ShoppingBasket" size={24} color="#10B981" />
            <View className="flex-1">
              <Typography variant="h3">A little list, a fuller kitchen</Typography>
              <Typography color="muted" variant="caption">{purchased.length} of {items.length} picked up</Typography>
            </View>
          </View>
          <View className="h-1.5 rounded-full bg-ground-surface overflow-hidden">
            <View className="h-full bg-brand-500 rounded-full" style={{ width: `${items.length ? purchased.length / items.length * 100 : 0}%` }} />
          </View>
        </View>

        {suggestions.length ? (
          <View className="mb-4 p-3 bg-ground-card rounded-2xl border border-border-default flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Typography variant="caption" color="muted">Consumed Items Suggestions</Typography>
              <Typography variant="body" color="muted">{suggestions.join(', ')}</Typography>
            </View>
            <Button label="Add All" onPress={async () => { for (const s of suggestions) await addSuggestion(s); }} variant="ghost" />
          </View>
        ) : null}

        <View className="p-4 bg-ground-card rounded-2xl border border-border-default shadow-sm mb-6 gap-3">
          {toBuy.map((item) => (
            <Checkbox key={item.id} checked={false} label={item.name} onToggle={() => void toggleItem(item.id, true)} className="py-1" />
          ))}

          {purchased.length ? (
            <View className="mt-4">
              <Typography variant="h4">Purchased</Typography>
              {purchased.map((item) => (
                <Checkbox key={item.id} checked={true} label={item.name} onToggle={() => void toggleItem(item.id, false)} className="py-1" />
              ))}
            </View>
          ) : null}
        </View>

        <View className="flex-row gap-3">
          <Button label="Move Purchased to Pantry" leadingIcon={<Icon name="Inbox" size={16} />} onPress={movePurchasedToPantry} />
          <Button label="Add Custom Item" variant="outline" leadingIcon={<Icon name="Plus" size={16} />} onPress={() => { /* TODO: show add dialog */ }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
