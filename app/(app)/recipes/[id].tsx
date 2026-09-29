import React, { useMemo } from "react";
import { Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RecipeDetailView } from "@/src/components/domain/RecipeDetailView";
import { useInventory } from "@/src/context/InventoryContext";

export default function RecipeDetailRouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { recipes, inventory, selectedRecipe } = useInventory();

  const recipe = recipes.find((r) => r.id === id) || (selectedRecipe?.id === id ? selectedRecipe : null);

  const inventoryNames = useMemo(
    () => new Set(inventory.map((i) => i.name.toLowerCase())),
    [inventory]
  );

  if (!recipe) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas items-center justify-center p-6">
        <Text className="text-[16px] font-bold text-text-primary mb-4">
          Recipe not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="px-5 py-2.5 rounded-xl bg-brand-500"
        >
          <Text className="text-white font-bold">Return to Recipes</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <RecipeDetailView
        recipe={recipe}
        inventoryItemNames={inventoryNames}
        onBack={() => router.back()}
      />
    </SafeAreaView>
  );
}
