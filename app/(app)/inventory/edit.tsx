import React, { useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { RoutePlaceholder } from "@/src/components/layout/RoutePlaceholder";
import { FormField } from "@/src/components/molecules/FormField";
import { Button } from "@/src/components/atoms";

export default function EditInventoryItemScreen() {
  const router = useRouter();
  const [name, setName] = useState("Whole Milk");
  const [quantity, setQuantity] = useState("1 gallon");
  const [expDate, setExpDate] = useState("2026-09-16");

  return (
    <RoutePlaceholder
      title="Edit Inventory Item"
      category="Inventory"
      routePath="/(app)/inventory/edit"
      description="Update item metadata, adjust remaining quantity, or correct expiration date."
      iconName="Edit3"
    >
      <View className="gap-4">
        <FormField
          label="Item Name"
          value={name}
          onChangeText={setName}
        />
        <FormField
          label="Quantity"
          value={quantity}
          onChangeText={setQuantity}
        />
        <FormField
          label="Expiration Date (YYYY-MM-DD)"
          value={expDate}
          onChangeText={setExpDate}
        />
        <Button
          label="Save Changes"
          variant="primary"
          onPress={() => router.back()}
        />
      </View>
    </RoutePlaceholder>
  );
}
