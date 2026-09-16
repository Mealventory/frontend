import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Button, Icon } from "@/src/components/atoms";
import { FormField, TagChipGroup } from "@/src/components/molecules";
import { useInventory } from "@/src/context/InventoryContext";

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
  const [error, setError] = useState("");

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter an item name.");
      return;
    }

    let days = 7;
    let formattedDate = expDate.trim();

    if (expDate.trim()) {
      const parsed = new Date(expDate.trim());
      if (!isNaN(parsed.getTime())) {
        const diffMs = parsed.getTime() - Date.now();
        days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        formattedDate = parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
    } else {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 7);
      formattedDate = targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }

    addItem({
      id: Date.now().toString(),
      name: trimmedName,
      category: selectedCat,
      expDate: formattedDate,
      daysLeft: days,
      quantity: quantity.trim() || "1 item",
      emoji: categoryEmojis[selectedCat] || "🍽️",
    });

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/(tabs)" as any);
    }
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
            helperText="Leave blank to default to 7 days from now"
            leadingIcon={<Icon name="Calendar" size={16} color="#94A3B8" />}
          />
        </View>

        <Button
          label="Add to Pantry"
          variant="primary"
          leadingIcon={<Icon name="Plus" size={18} color="#FFFFFF" />}
          onPress={handleSave}
          disabled={!name.trim()}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
