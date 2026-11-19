import { ExpiryPrediction } from '@/src/components/molecules/ExpiryPrediction';
import { ExpiryDateField } from '@/src/components/molecules/ExpiryDateField';
import { normalizeExpiryDate } from '@/src/lib/expiryDate';
import { InventoryConflictError, InventoryItemGoneError } from '@/src/lib/inventoryApi';
import { APP_GUTTER, APP_PAGE_TOP } from '@/src/lib/layout';
import { E2E_EDITED_ITEM_NAME } from '@/src/lib/e2e';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FormField, TagChipGroup } from '@/src/components/molecules';
import { Button, Typography } from '@/src/components/atoms';
import { useInventory } from '@/src/context/InventoryContext';
import { useAuth } from '@/src/context/AuthContext';
import { ItemPhotoField, type SelectedItemPhoto } from '@/src/components/molecules/ItemPhotoField';
import { deleteItemPhoto, uploadItemPhoto } from '@/src/lib/itemPhotoStorage';
import type { FoodItem, StorageZone } from '@/src/types';

export default function EditInventoryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { inventory, inventoryLoading } = useInventory();
  const router = useRouter();
  const item = inventory.find(i => i.id === id);
  // Retain the item being edited even if a background refresh discovers it
  // was merged or deleted. The draft must remain visible until the user leaves.
  const snapshot = useRef<{ id: string; item: FoodItem } | null>(null);
  if (item && (!snapshot.current || snapshot.current.id !== id)) {
    snapshot.current = { id: item.id, item };
  }
  const editableItem = item ?? (snapshot.current?.id === id ? snapshot.current.item : null);
  if (!editableItem) return <SafeAreaView className="flex-1 bg-ground-canvas justify-center p-6 gap-4">
    <Typography>{inventoryLoading ? 'Loading item…' : 'This item is no longer in your pantry.'}</Typography>
    <Button label="Back" onPress={() => router.back()} />
  </SafeAreaView>;
  return <EditForm key={editableItem.id} item={editableItem} />;
}

function EditForm({ item }: { item: FoodItem }) {
  const router = useRouter();
  const { updateItem, getLatestItem } = useInventory();
  const { household, e2eMode } = useAuth();
  const [name, setName] = useState(e2eMode ? E2E_EDITED_ITEM_NAME : item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [category, setCategory] = useState(item.category);
  const [date, setDate] = useState(item.expiryDate || '');
  const [zone, setZone] = useState<StorageZone>(item.storageZone || 'pantry');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  // Keep the revision this editor originally displayed, even if the pantry
  // cache refreshes while the user is editing.
  const baseVersion = useRef(item.version);
  const [conflict, setConflict] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [latest, setLatest] = useState<FoodItem | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [error, setError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedItemPhoto | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const expiryInputFocused = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const listener = Keyboard.addListener('keyboardDidShow', () => {
      if (expiryInputFocused.current) {
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    });
    return () => listener.remove();
  }, []);

  const liveQuantity = quantity.trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  const save = async () => {
    if (lock.current) return;
    const amount = liveQuantity;
    let expiry: string | null;
    try { expiry = normalizeExpiryDate(date); } catch (e) { setError((e as Error).message); return; }
    if (!name.trim() || !category.trim()) { setError('Enter an item name and category.'); return; }
    if (!amount || !Number.isFinite(Number(amount[1])) || Number(amount[1]) <= 0) { setError('Enter a positive quantity, such as 2 tubs or 500 g.'); return; }
    lock.current = true; setSaving(true); setError('');
    let uploadedRef: string | null = null;
    try {
      if (selectedPhoto) {
        if (!household?.id) throw new Error('Choose a household before adding a photo.');
        uploadedRef = await uploadItemPhoto(
          household.id,
          selectedPhoto.base64,
          selectedPhoto.mimeType,
        );
      }

      await updateItem(item.id, {
        name: name.trim(),
        category: category.trim(),
        quantity: Number(amount[1]),
        unit: amount[2] || 'units',
        expiry_date: expiry || null,
        storage_zone: zone,
        ...(selectedPhoto
          ? { image_ref: uploadedRef }
          : removePhoto
          ? { image_ref: null }
          : {}),
      }, baseVersion.current);

      if ((selectedPhoto || removePhoto) && item.imageRef) {
        void deleteItemPhoto(item.imageRef).catch(() => {});
      }
      router.back();
    } catch (e) {
      if (uploadedRef) {
        await deleteItemPhoto(uploadedRef).catch(() => {});
      }
      setError(e instanceof Error ? e.message : 'Could not save changes.');
      if (e instanceof InventoryConflictError || e instanceof InventoryItemGoneError) {
        setConflict(true);
        setReviewed(false);
        setLatest(null);
      }
    }
    finally { lock.current = false; setSaving(false); }
  };

  const reviewLatest = async () => {
    if (reviewBusy) return;
    setReviewBusy(true);
    try {
      // A read-only request preserves every unsaved field in this editor.
      const current = await getLatestItem(item.id);
      setLatest(current);
      setReviewed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the latest item.');
    } finally {
      setReviewBusy(false);
    }
  };

  const useLatestValues = () => {
    if (!latest) return;
    setName(latest.name);
    setQuantity(latest.quantity);
    setCategory(latest.category);
    setDate(latest.expiryDate ?? '');
    setZone(latest.storageZone ?? 'pantry');
    setSelectedPhoto(null);
    setRemovePhoto(false);
    baseVersion.current = latest.version;
    setConflict(false);
    setError('');
  };

  const keepDraftOnLatest = () => {
    if (!latest) return;
    baseVersion.current = latest.version;
    setConflict(false);
    setError('');
  };
  return <SafeAreaView className="flex-1 bg-ground-canvas">
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView
      ref={scrollRef}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}
      contentContainerStyle={{ paddingHorizontal: APP_GUTTER, paddingTop: APP_PAGE_TOP, paddingBottom: 48 }}
    >
      <View className="flex-row items-center mb-6">
        <Button label="Cancel" singleLine size="sm" className="w-24 shrink-0 px-2" variant="ghost" disabled={saving} onPress={() => router.back()} />
        <Typography variant="h3" className="flex-1 text-center">Edit item</Typography>
        <View style={{ width: 96 }} />
      </View>
      <View className="gap-5">
        <ItemPhotoField
          existingRef={item.imageRef}
          selected={selectedPhoto}
          removed={removePhoto}
          fallbackEmoji={item.emoji}
          disabled={saving}
          onChange={(photo) => {
            setSelectedPhoto(photo);
            setRemovePhoto(false);
            setError('');
          }}
          onRemove={() => {
            setSelectedPhoto(null);
            setRemovePhoto(true);
          }}
          onError={setError}
        />
        <FormField testID="e2e-edit-name" label="Item name" value={name} onChangeText={setName} editable={!saving} maxLength={200} />
        <FormField testID="e2e-edit-quantity" label="Quantity / size" value={quantity} onChangeText={setQuantity} editable={!saving} placeholder="e.g. 2 tubs or 500 g" />
        <Typography variant="caption" color="muted">
          Low-stock tracking is automatic. Mealventory remembers the amount you originally added and warns at 10% remaining.
        </Typography>
        <FormField label="Category" value={category} onChangeText={setCategory} editable={!saving} maxLength={80} />
        <ExpiryPrediction name={name} zone={zone} value={date} onApply={setDate} itemId={item.id} disabled={saving} />
        <ExpiryDateField
          value={date}
          onChangeText={setDate}
          editable={!saving}
          onInputFocus={() => {
            expiryInputFocused.current = true;
            scrollRef.current?.scrollToEnd({ animated: true });
          }}
          onInputBlur={() => { expiryInputFocused.current = false; }}
        />
        <View pointerEvents={saving ? 'none' : 'auto'}>
          <Typography variant="caption" className="mb-2">Storage location</Typography>
          <TagChipGroup tags={['pantry', 'fridge', 'freezer', 'spicerack']} selectedTag={zone} onSelectTag={v => setZone(v as StorageZone)} />
        </View>
        {!!error && <Text accessibilityRole="alert" className="text-urgency-critical">{error}</Text>}
        {conflict && (
          <View className="gap-3 p-4 rounded-2xl border border-border-default bg-ground-subtle">
            <Typography variant="body" className="font-bold">Another member changed this item</Typography>
            <Typography variant="caption" color="muted">
              Your edits are still in the form. Review the newest values before deciding whether to replace them.
            </Typography>
            <Button label="Review latest item" variant="secondary" loading={reviewBusy} onPress={() => void reviewLatest()} />
            {reviewed && !latest && (
              <Typography variant="caption" color="muted">
                This item is no longer in the kitchen. It may have been deleted or merged into another item.
                Your draft remains visible until you leave.
              </Typography>
            )}
            {latest && (
              <View className="gap-2">
                <Typography variant="caption">
                  Latest: {latest.name}, {latest.quantity}, {latest.storageZone ?? 'pantry'}.
                  Version {latest.version}.
                </Typography>
                <Button label="Use latest values" variant="secondary" onPress={useLatestValues} />
                <Button label="Keep my draft and retry" variant="outline" onPress={keepDraftOnLatest} />
                <Typography variant="caption" color="muted">
                  Keeping your draft means your next save will intentionally replace the latest item's fields.
                </Typography>
              </View>
            )}
          </View>
        )}
        <Button testID="e2e-save-edit" label={saving ? 'Saving…' : 'Save changes'} disabled={saving} onPress={save} />
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
