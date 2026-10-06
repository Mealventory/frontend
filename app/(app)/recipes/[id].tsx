import React, { useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RecipeDetailView } from "@/src/components/domain/RecipeDetailView";
import { useInventory } from "@/src/context/InventoryContext";
import { useAuth } from "@/src/context/AuthContext";
import { addMissingIngredientsToShopping } from "@/src/lib/shoppingApi";

export default function RecipeDetailRouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session, household } = useAuth();
  const {
    recipes,
    savedRecipes,
    savedRecipesLoading,
    inventory,
    selectedRecipe,
    isRecipeSaved,
    toggleSavedRecipe,
  } = useInventory();
  const [saveError, setSaveError] = useState("");

  const recipe =
    savedRecipes.find((item) => item.id === id) ||
    recipes.find((item) => item.id === id) ||
    (selectedRecipe?.id === id ? selectedRecipe : null);

  const inventoryNames = useMemo(
    () =>
      new Set(
        inventory
          .filter((item) => !item.expiryDate || item.daysLeft >= 0)
          .map((item) => item.name.toLowerCase())
      ),
    [inventory]
  );

  if (!recipe && savedRecipesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas items-center justify-center p-6">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="text-[13px] text-text-muted mt-3">
          Loading saved recipe…
        </Text>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas items-center justify-center p-6">
        <Text className="text-[16px] font-bold text-text-primary mb-4">
          Recipe not found
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Return to Recipes"
          onPress={() => router.back()}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-500 items-center justify-center"
        >
          <Text className="text-white font-bold">Return to Recipes</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const toggleSaved = async () => {
    setSaveError("");
    try {
      await toggleSavedRecipe(recipe);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Could not update saved recipes."
      );
    }
  };

  const addMissing = async (ingredients: string[]) => {
    if (!session || !household) {
      throw new Error("Choose a household before updating the shopping list.");
    }
    return addMissingIngredientsToShopping(
      session.access_token,
      household.id,
      ingredients
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      {!!saveError && (
        <Text
          accessibilityRole="alert"
          className="mx-4 mt-3 p-3 rounded-xl bg-urgency-critical-bg text-urgency-critical text-[12px] font-semibold"
        >
          {saveError}
        </Text>
      )}
      <RecipeDetailView
        recipe={recipe}
        inventoryItemNames={inventoryNames}
        saved={isRecipeSaved(recipe)}
        onToggleSaved={toggleSaved}
        onStartCooking={() =>
          router.push({
            pathname: "/(app)/recipes/[id]/cook",
            params: { id: recipe.id },
          } as any)
        }
        onPlanMeal={() =>
          router.push({
            pathname: "/(app)/meal-plan",
            params: { recipeId: recipe.id },
          } as any)
        }
        onAddMissingIngredients={addMissing}
        onBack={() => router.back()}
      />
    </SafeAreaView>
  );
}
