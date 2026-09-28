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
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-ground-canvas">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 28 }}>
        <View className="mb-6">
          <Typography variant="h1">Shopping List</Typography>
          <Typography variant="caption" color="muted">
            Auto-populated from low pantry stock & missing recipe ingredients
          </Typography>
        </View>

        <View className="rounded-[24px] bg-brand-50 dark:bg-brand-500/10 p-5 mb-5 border border-brand-500/20">
          <View className="flex-row items-center gap-3 mb-3">
            <Icon name="ShoppingBasket" size={24} color="#10B981" />
            <View className="flex-1">
              <Typography variant="h3">A little list, a fuller kitchen</Typography>
              <Typography color="muted" variant="caption">{items.filter(item => item.checked).length} of {items.length} picked up</Typography>
            </View>
          </View>
          <View className="h-1.5 rounded-full bg-ground-surface overflow-hidden">
            <View className="h-full bg-brand-500 rounded-full" style={{ width: `${items.length ? items.filter(item => item.checked).length / items.length * 100 : 0}%` }} />
          </View>
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
