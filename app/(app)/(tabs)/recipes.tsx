import React, { useState, useMemo } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography } from "@/src/components/atoms";
import { EmptyState } from "@/src/components/molecules/EmptyState";
import { RecipeCard } from "@/src/components/domain/RecipeCard";
import { TagChipGroup } from "@/src/components/molecules/TagChipGroup";
import { useInventory } from "@/src/context/InventoryContext";

const tags = ["All", "Breakfast", "Lunch", "Dinner", "Snack"];

export default function RecipesTabScreen() {
  const router = useRouter();
  const { recipes, inventory, openRecipe } = useInventory();
  const [selectedTag, setSelectedTag] = useState("All");

  const inventoryNames = useMemo(
    () => new Set(inventory.map((i) => i.name.toLowerCase())),
    [inventory]
  );

  const filtered = recipes.filter(
    (r) => selectedTag === "All" || r.tag === selectedTag
  );

  return (
    <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-ground-canvas">
      <View className="px-5 pt-3 bg-ground-canvas">
        <Typography variant="h1">Recipes</Typography>
        <Typography variant="caption" color="muted" className="mt-0.5 mb-3.5">
          Based on what's in your kitchen
        </Typography>

        <TagChipGroup
          tags={tags}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          className="pb-3.5"
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="gap-2.5">
          {filtered.length === 0 && <EmptyState icon="UtensilsCrossed" title="Something good is coming"
            description="No recipes in this selection yet. Explore another category for a little kitchen inspiration."
            actionLabel={selectedTag !== "All" ? "Explore all recipes" : undefined} onAction={() => setSelectedTag("All")} />}
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              inventoryItemNames={inventoryNames}
              onPress={(rec) => {
                openRecipe(rec);
                router.push(`/(app)/recipes/${rec.id}` as any);
              }}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
