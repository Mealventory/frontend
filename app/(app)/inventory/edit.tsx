import { ExpiryPrediction } from '@/src/components/molecules/ExpiryPrediction';
import { ExpiryDateField } from '@/src/components/molecules/ExpiryDateField';
import { normalizeExpiryDate } from '@/src/lib/expiryDate';
import React, { useRef, useState } from 'react';
import { ScrollView, View, Text, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FormField, TagChipGroup } from '@/src/components/molecules';
import { Button, Typography } from '@/src/components/atoms';
import { useInventory } from '@/src/context/InventoryContext';
import type { FoodItem, StorageZone } from '@/src/types';

export default function EditInventoryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { inventory, inventoryLoading } = useInventory();
  const router = useRouter();
  const item = inventory.find(i => i.id === id);
  if (!item) return <SafeAreaView className="flex-1 bg-ground-canvas justify-center p-6 gap-4">
    <Typography>{inventoryLoading ? 'Loading item…' : 'This item is no longer in your pantry.'}</Typography>
    <Button label="Back" onPress={() => router.back()} />
  </SafeAreaView>;
  return <EditForm key={item.id} item={item} />;
}

function EditForm({ item }: { item: FoodItem }) {
  const router = useRouter();
  const { updateItem } = useInventory();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [category, setCategory] = useState(item.category);
  const parsedItemQuantity = item.quantity.trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  const [trackQuantity, setTrackQuantity] = useState(Boolean(item.quantityTrackingEnabled));
  const [referenceQuantity, setReferenceQuantity] = useState(
    item.initialQuantity != null
      ? String(item.initialQuantity)
      : parsedItemQuantity?.[1] || ''
  );
  const [thresholdPercent, setThresholdPercent] = useState(
    String(item.lowStockThresholdPercent ?? 10)
  );
  const [date, setDate] = useState(item.expiryDate || '');
  const [zone, setZone] = useState<StorageZone>(item.storageZone || 'pantry');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (lock.current) return;
    const amount = quantity.trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    let expiry: string | null;
    try { expiry = normalizeExpiryDate(date); } catch (e) { setError((e as Error).message); return; }
    if (!name.trim() || !category.trim()) { setError('Enter an item name and category.'); return; }
    if (!amount || !Number.isFinite(Number(amount[1])) || Number(amount[1]) <= 0) { setError('Enter a positive quantity, such as 2 tubs or 500 g.'); return; }
    const reference = Number(referenceQuantity);
    const threshold = Number(thresholdPercent);
    if (trackQuantity && (!Number.isFinite(reference) || reference <= 0)) {
      setError('Enter a positive reference quantity for low-stock tracking.');
      return;
    }
    if (trackQuantity && (!Number.isFinite(threshold) || threshold <= 0 || threshold > 100)) {
      setError('Low-stock threshold must be between 1% and 100%.');
      return;
    }
    lock.current = true; setSaving(true); setError('');
    try {
      await updateItem(item.id, {
        name: name.trim(),
        category: category.trim(),
        quantity: Number(amount[1]),
        unit: amount[2] || 'units',
        expiry_date: expiry || null,
        storage_zone: zone,
        quantity_tracking_enabled: trackQuantity,
        initial_quantity: trackQuantity ? reference : null,
        low_stock_threshold_percent: trackQuantity ? threshold : (item.lowStockThresholdPercent ?? 10),
      });
      router.back();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save changes.'); }
    finally { lock.current = false; setSaving(false); }
  };
  return <SafeAreaView className="flex-1 bg-ground-canvas">
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 48, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      <View className="flex-row items-center mb-6">
        <Button label="Cancel" variant="ghost" disabled={saving} onPress={() => router.back()} />
        <Typography variant="h3" className="flex-1 text-center">Edit item</Typography>
        <View style={{ width: 80 }} />
      </View>
      <View className="gap-5">
        <FormField label="Item name" value={name} onChangeText={setName} editable={!saving} maxLength={200} />
        <FormField label="Quantity / size" value={quantity} onChangeText={setQuantity} editable={!saving} placeholder="e.g. 2 tubs or 500 g" />
        <View className="gap-3 p-4 rounded-2xl bg-ground-surface border border-border-default">
          <View className="flex-row items-center justify-between gap-4">
            <View className="flex-1">
              <Typography variant="body" className="font-bold">Track quantity for low stock</Typography>
              <Typography variant="caption" color="muted">
                Alert this household when the remaining amount reaches your threshold.
              </Typography>
            </View>
            <Switch
              accessibilityLabel="Track quantity for low stock"
              value={trackQuantity}
              disabled={saving}
              onValueChange={(enabled) => {
                setTrackQuantity(enabled);
                if (enabled && !referenceQuantity.trim() && amount?.[1]) {
                  setReferenceQuantity(amount[1]);
                }
              }}
            />
          </View>
          {trackQuantity && (
            <View className="gap-3">
              <FormField
                label={`Reference quantity (${amount?.[2]?.trim() || 'units'})`}
                value={referenceQuantity}
                onChangeText={setReferenceQuantity}
                editable={!saving}
                placeholder="e.g. 2"
              />
              <FormField
                label="Low-stock threshold (%)"
                value={thresholdPercent}
                onChangeText={setThresholdPercent}
                editable={!saving}
                placeholder="10"
              />
              <Typography variant="caption" color="muted">
                Remaining percentage uses this reference quantity and the same unit as the item.
              </Typography>
            </View>
          )}
        </View>
        <FormField label="Category" value={category} onChangeText={setCategory} editable={!saving} maxLength={80} />
        <ExpiryPrediction name={name} zone={zone} value={date} onApply={setDate} itemId={item.id} disabled={saving} />
        <ExpiryDateField value={date} onChangeText={setDate} editable={!saving} />
        <View pointerEvents={saving ? 'none' : 'auto'}>
          <Typography variant="caption" className="mb-2">Storage location</Typography>
          <TagChipGroup tags={['pantry', 'fridge', 'freezer', 'spicerack']} selectedTag={zone} onSelectTag={v => setZone(v as StorageZone)} />
        </View>
        {!!error && <Text accessibilityRole="alert" className="text-urgency-critical">{error}</Text>}
        <Button label={saving ? 'Saving…' : 'Save changes'} disabled={saving} onPress={save} />
      </View>
    </ScrollView>
  </SafeAreaView>;
}
