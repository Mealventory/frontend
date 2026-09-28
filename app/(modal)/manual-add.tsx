import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Button, Icon } from "@/src/components/atoms";
import { FormField, TagChipGroup } from "@/src/components/molecules";
import { useInventory } from "@/src/context/InventoryContext";

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
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expDate, setExpDate] = useState("");
  const [selectedCat, setSelectedCat] = useState("Produce");
  const [storageZone, setStorageZone] = useState<StorageZone>("pantry");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter an item name.");
      return;
    }

    const date = expDate.trim();
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) {
      setError('Enter a valid expiration date as YYYY-MM-DD.'); return;
    }
    setSaving(true); setError('');
    try {
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
    });

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/(tabs)" as any);
    }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save item.'); }
    finally { setSaving(false); }
  };

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Button
            label="Cancel"
            variant="ghost"
            size="sm"
            onPress={() => router.back()}
          />
          <Typography variant="h3" className="font-bold">
            Manual Entry
          </Typography>
          <View className="w-12" />
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

          <FormField
            label="Expiration Date"
            placeholder="YYYY-MM-DD (e.g. 2026-09-25)"
            value={expDate}
            onChangeText={setExpDate}
            helperText="Leave blank if the expiration date is unknown"
            leadingIcon={<Icon name="Calendar" size={16} color="#94A3B8" />}
          />
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
