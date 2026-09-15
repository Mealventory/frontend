import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RecipeCard } from "@/src/components/domain/RecipeCard";
import { RecipeDetailView } from "@/src/components/domain/RecipeDetailView";
import { BottomNav } from "@/src/components/layout/BottomNav";
import { TagChipGroup } from "@/src/components/molecules/TagChipGroup";
import { useInventory, FigmaScreen } from "@/src/context/InventoryContext";
import { Recipe } from "@/src/types";

const tags = ["All", "Breakfast", "Lunch", "Dinner", "Snack"];

export interface RecipesScreenProps {
  onNavigate: (screen: FigmaScreen) => void;
}

export function RecipesScreen({ onNavigate }: RecipesScreenProps) {
  const { recipes, inventory, selectedRecipe, openRecipe, user } = useInventory();
  const [filter, setFilter] = useState("All");
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(selectedRecipe);

  const inventoryNames = useMemo(
    () => new Set(inventory.map((i) => i.name.toLowerCase())),
    [inventory]
  );

  const filtered = recipes.filter(
    (r) => filter === "All" || r.tag === filter
  );

  if (activeRecipe) {
    return (
      <SafeAreaView className="flex-1 bg-ground-canvas">
        <RecipeDetailView
          recipe={activeRecipe}
          inventoryItemNames={inventoryNames}
          onBack={() => setActiveRecipe(null)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ground-canvas">
      <View className="px-5 pt-3 bg-ground-canvas">
        <View className="flex-row items-center justify-between mb-1">
          <View>
            <Text className="text-[22px] font-bold text-text-primary tracking-tight">
              Recipes
            </Text>
            <Text className="text-[13px] text-text-muted mt-0.5">
              Based on what's in your kitchen
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onNavigate("settings")}
            className="w-10 h-10 rounded-full bg-brand-500/15 border border-brand-500/30 items-center justify-center"
          >
            <Text className="text-[13px] font-bold text-brand-500">
              {user.initials}
            </Text>
          </TouchableOpacity>
        </View>

        <TagChipGroup
          tags={tags}
          selectedTag={filter}
          onSelectTag={setFilter}
          className="pb-3.5"
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        <View className="gap-2.5">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              inventoryItemNames={inventoryNames}
              onPress={(rec) => {
                openRecipe(rec);
                setActiveRecipe(rec);
              }}
            />
          ))}
        </View>
      </ScrollView>

      {/* Floating Bottom Nav */}
      <BottomNav activeScreen="recipes" onNavigate={onNavigate} />
    </SafeAreaView>
  );
}
