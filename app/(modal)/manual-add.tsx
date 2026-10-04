import { ExpiryPrediction } from '@/src/components/molecules/ExpiryPrediction';
import { ExpiryDateField } from '@/src/components/molecules/ExpiryDateField';
import { normalizeExpiryDate } from '@/src/lib/expiryDate';
import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Button, Icon } from "@/src/components/atoms";
import { FormField, TagChipGroup } from "@/src/components/molecules";
import { useInventory } from "@/src/context/InventoryContext";
import { useAuth } from "@/src/context/AuthContext";
import { ItemPhotoField, type SelectedItemPhoto } from "@/src/components/molecules/ItemPhotoField";
import { deleteItemPhoto, uploadItemPhoto } from "@/src/lib/itemPhotoStorage";

import type { StorageZone } from "@/src/types";

const categories = ["Produce", "Dairy", "Meat", "Bakery", "Pantry", "Beverage", "Snacks"];

const categoryEmojis: Record<string, string> = {
  Produce: "🥬",
  Dairy: "🥛",
  Meat: "🥩",
  Bakery: "🍞",
  Pantry: "🥫",
  Beverage: "🧃",
  Snacks: "🥨",
};

export default function ManualAddModal() {
  const router = useRouter();
  const { addItem } = useInventory();
  const { household } = useAuth();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expDate, setExpDate] = useState("");
  const [selectedCat, setSelectedCat] = useState("Produce");
  const [storageZone, setStorageZone] = useState<StorageZone>("pantry");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<SelectedItemPhoto | null>(null);

  const handleSave = async () => {
    if (saving) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter an item name.");
      return;
    }

    let date: string | null;
    try { date = normalizeExpiryDate(expDate); } catch (e) { setError((e as Error).message); return; }
    setSaving(true); setError('');
    let uploadedRef: string | null = null;
    try {
    if (selectedPhoto) {
      if (!household?.id) throw new Error("Choose a household before adding a photo.");
      uploadedRef = await uploadItemPhoto(
        household.id,
        selectedPhoto.base64,
        selectedPhoto.mimeType,
      );
    }
    await addItem({
      id: Date.now().toString(),
      name: trimmedName,
      category: selectedCat,
      storageZone,
      expDate: date || 'Not set',
      expiryDate: date || null,
      daysLeft: 0,
      quantity: quantity.trim() || "1 item",
      emoji: categoryEmojis[selectedCat] || "🍽️",
      imageRef: uploadedRef,
    });

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/(tabs)" as any);
    }
    } catch (e) {
      if (uploadedRef) {
        await deleteItemPhoto(uploadedRef).catch(() => {});
      }
      setError(e instanceof Error ? e.message : 'Could not save item.');
    }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 40, width: "100%", maxWidth: 560, alignSelf: "center" }}>
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-5">
          <Button
            className="w-20 px-0"
            label="Cancel"
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
          />
          <Typography variant="h3" className="font-bold text-center flex-1">
            Manual Entry
          </Typography>
          <View className="w-20" />
        </View>

        <Typography variant="caption" color="muted" className="mb-6">
          Manually input food item details when camera scanning is unavailable
        </Typography>

        <View className="gap-4 mb-6">
          <FormField
            label="Item Name"
            placeholder="e.g. Sourdough Bread"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError("");
            }}
            required
            error={error}
            leadingIcon={<Icon name="Type" size={16} color="#94A3B8" />}
          />

          <ItemPhotoField
            selected={selectedPhoto}
            fallbackEmoji={categoryEmojis[selectedCat] || "🍽️"}
            disabled={saving}
            onChange={(photo) => {
              setSelectedPhoto(photo);
              setError("");
            }}
            onRemove={() => setSelectedPhoto(null)}
            onError={setError}
          />

          <View>
            <Typography variant="caption" className="font-semibold text-text-secondary uppercase tracking-wider mb-2 ml-1">
              Category
            </Typography>
            <TagChipGroup
              tags={categories}
              selectedTag={selectedCat}
              onSelectTag={setSelectedCat}
            />
          </View>

          <View>
            <Typography variant="caption">Storage zone</Typography>
            <TagChipGroup tags={["pantry", "fridge", "freezer", "spicerack"]}
              selectedTag={storageZone} onSelectTag={(zone) => setStorageZone(zone as StorageZone)} />
          </View>

          <FormField
            label="Quantity / Size"
            placeholder="e.g. 1 loaf or 500g"
            value={quantity}
            onChangeText={setQuantity}
            leadingIcon={<Icon name="Package" size={16} color="#94A3B8" />}
          />

          <ExpiryPrediction name={name} zone={storageZone} value={expDate} onApply={setExpDate} disabled={saving} />
          <ExpiryDateField value={expDate} onChangeText={setExpDate} editable={!saving} />
        </View>

        <Button
          label={saving ? 'Saving…' : 'Add to Kitchen'}
          variant="primary"
          leadingIcon={<Icon name="Plus" size={18} color="#FFFFFF" />}
          onPress={handleSave}
          disabled={saving || !name.trim()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
