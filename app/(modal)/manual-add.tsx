import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Button, Icon } from "@/src/components/atoms";
import { FormField, TagChipGroup } from "@/src/components/molecules";

const categories = ["Produce", "Dairy", "Meat", "Bakery", "Pantry", "Beverage"];

export default function ManualAddModal() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expDate, setExpDate] = useState("");
  const [selectedCat, setSelectedCat] = useState("Produce");

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
            onChangeText={setName}
            required
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
            placeholder="YYYY-MM-DD"
            value={expDate}
            onChangeText={setExpDate}
            leadingIcon={<Icon name="Calendar" size={16} color="#94A3B8" />}
          />
        </View>

        <Button
          label="Add to Pantry"
          variant="primary"
          leadingIcon={<Icon name="Plus" size={18} color="#FFFFFF" />}
          onPress={() => router.replace("/(app)/(tabs)" as any)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
