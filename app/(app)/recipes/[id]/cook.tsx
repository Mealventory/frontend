import React from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CookingModeView } from "@/src/components/domain/CookingModeView";
import { useInventory } from "@/src/context/InventoryContext";

export default function CookingModeRouteScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const {
    recipes,
    savedRecipes,
    savedRecipesLoading,
    selectedRecipe,
  } = useInventory();

  const recipe =
    savedRecipes.find((item) => item.id === id) ||
    recipes.find((item) => item.id === id) ||
    (selectedRecipe?.id === id ? selectedRecipe : null);

  if (!recipe && savedRecipesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas items-center justify-center p-6">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="text-[13px] text-text-muted mt-3">Loading cooking mode…</Text>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas items-center justify-center p-6">
        <Text className="text-[17px] font-bold text-text-primary mb-2">Recipe not found</Text>
        <Text className="text-[13px] text-text-muted text-center mb-5">
          Return to Recipes and choose a recipe to start cooking.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.replace("/(app)/(tabs)/recipes" as any)}
          className="px-5 py-3 rounded-xl bg-brand-500"
        >
          <Text className="text-white font-bold">Return to Recipes</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <CookingModeView
      recipe={recipe}
      onBack={() => router.back()}
      onFinish={() =>
        router.replace({
          pathname: "/(app)/recipes/[id]",
          params: { id: recipe.id },
        } as any)
      }
    />
  );
}
