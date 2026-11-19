import { ActivityIndicator, ScrollView, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RecipeCreateForm } from "@/src/components/domain/RecipeCreateForm";
import { useInventory } from "@/src/context/InventoryContext";
import { recipeSaveKey } from "@/src/lib/savedRecipes";
import type { Recipe } from "@/src/types";

export default function EditSavedRecipeRouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    savedRecipes,
    savedRecipesLoading,
    selectedRecipe,
    updateSavedRecipe,
  } = useInventory();

  const recipe = savedRecipes.find(item => item.id === id)
    || (selectedRecipe?.id === id ? selectedRecipe : null);

  if (!recipe && savedRecipesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas items-center justify-center p-6">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="text-[13px] text-text-muted mt-3">Loading saved recipe…</Text>
      </SafeAreaView>
    );
  }

  if (!recipe || (recipe.origin !== "custom" && recipe.tag !== "Custom")) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas items-center justify-center p-6">
        <Text className="text-[16px] font-bold text-text-primary mb-4">Custom recipe not found</Text>
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

  const save = async (updated: Recipe) => {
    const duplicate = savedRecipes.some(saved =>
      saved.id !== recipe.id && recipeSaveKey(saved) === recipeSaveKey(updated)
    );
    if (duplicate) {
      throw new Error("Another saved recipe already has this name and ingredients. Change the name or ingredients to keep both recipes.");
    }
    await updateSavedRecipe(recipe, updated);
  };

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}>
        <RecipeCreateForm
          key={recipe.id}
          initialRecipe={recipe}
          onCancel={() => router.back()}
          onSave={save}
          onSaved={() => router.replace("/(app)/(tabs)/recipes" as any)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
