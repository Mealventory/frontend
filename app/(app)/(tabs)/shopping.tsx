import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Typography, Button, Icon, Checkbox } from "@/src/components/atoms";

const initialList = [
  { id: "1", label: "Almond Milk (Unsweetened)", checked: false },
  { id: "2", label: "Greek Yogurt (0% fat)", checked: true },
  { id: "3", label: "Avocados (Bag of 4)", checked: false },
  { id: "4", label: "Rolled Oats", checked: false },
  { id: "5", label: "Garlic (1 bulb)", checked: true },
];

export default function ShoppingTabScreen() {
  const [items, setItems] = useState(initialList);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i))
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <View className="mb-6">
          <Typography variant="h1">Shopping List</Typography>
          <Typography variant="caption" color="muted">
            Auto-populated from low pantry stock & missing recipe ingredients
          </Typography>
        </View>

        <View className="p-4 bg-ground-card rounded-2xl border border-border-default shadow-sm mb-6 gap-3">
          {items.map((item) => (
            <Checkbox
              key={item.id}
              checked={item.checked}
              label={item.label}
              onToggle={() => toggleItem(item.id)}
              className="py-1"
            />
          ))}
        </View>

        <Button
          label="Add Custom Item"
          variant="outline"
          leadingIcon={<Icon name="Plus" size={16} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
