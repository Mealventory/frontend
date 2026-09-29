import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Recipe } from "@/src/types";
import { Icon } from "../atoms/Icon";

export interface RecipeDetailViewProps {
  recipe: Recipe;
  inventoryItemNames: Set<string>;
  onBack: () => void;
}

export function RecipeDetailView({
  recipe,
  inventoryItemNames,
  onBack,
}: RecipeDetailViewProps) {
  const haveAll = !recipe.missingIngredients?.length && recipe.uses.every((u) =>
    inventoryItemNames.has(u.toLowerCase())
  );

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      className="flex-1"
    >
      {/* Back button header */}
      <View className="flex-row items-center gap-3 mb-4">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          className="w-10 h-10 rounded-[14px] bg-ground-subtle dark:bg-ground-elevated items-center justify-center border border-border-default"
        >
          <Icon name="ArrowLeft" size={18} />
        </TouchableOpacity>
        <Text className="text-[17px] font-bold text-text-primary">
          Recipe
        </Text>
      </View>

      {/* Hero Emoji Box */}
      <View className="h-[150px] rounded-[24px] bg-brand-50 dark:bg-brand-500/15 border border-brand-500/20 items-center justify-center mb-5">
        <Text className="text-[72px]">{recipe.emoji}</Text>
      </View>

      {/* Title & Match % */}
      <View className="flex-row items-start justify-between mb-4">
        <View className="flex-1 mr-3">
          <Text className="text-[22px] font-bold text-text-primary leading-tight">
            {recipe.name}
          </Text>
          <Text className="text-[14px] font-regular text-text-muted mt-1.5 leading-relaxed">
            {recipe.description}
          </Text>
        </View>
        <View className="px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/20 border border-brand-500/30">
          <Text className="text-[14px] font-bold text-brand-500">
            {recipe.match}%
          </Text>
        </View>
      </View>

      {/* Meta pills */}
      <View className="flex-row gap-2 mb-6">
        {[recipe.time, recipe.difficulty, recipe.tag].map((val) => (
          <View
            key={val}
            className="px-3.5 py-2 rounded-[16px] bg-ground-surface dark:bg-ground-card border border-border-default shadow-sm"
          >
            <Text className="text-[13px] font-bold text-text-secondary">
              {val}
            </Text>
          </View>
        ))}
      </View>

      {recipe.priorityIngredients?.length ? <Text className="text-brand-500 mb-3">Use soon: {recipe.priorityIngredients.join(', ')}</Text> : null}
      {recipe.missingIngredients?.length ? <Text className="text-text-muted mb-3">Extras to check: {recipe.missingIngredients.join(', ')}</Text> : null}
      {/* Ingredients List */}
      <View className="mb-6">
        <Text className="text-[12px] font-bold text-text-subtle uppercase tracking-widest mb-3">
          Ingredients
        </Text>
        <View className="gap-2">
          {recipe.uses.map((ing) => {
            const have = !recipe.missingIngredients?.includes(ing) && inventoryItemNames.has(ing.toLowerCase());
            return (
              <View
                key={ing}
                className="flex-row items-center justify-between p-3.5 bg-ground-surface dark:bg-ground-card rounded-[16px] border border-border-default shadow-sm"
              >
                <View className="flex-row items-center gap-3 flex-1">
                  <View
                    className={`w-5 h-5 rounded-full items-center justify-center ${
                      have
                        ? "bg-brand-50 dark:bg-brand-500/20"
                        : "bg-ground-subtle"
                    }`}
                  >
                    <Icon
                      name={have ? "Check" : "Plus"}
                      size={12}
                      color={have ? "#10B981" : "#94A3B8"}
                      strokeWidth={3}
                    />
                  </View>
                  <Text
                    className={`text-[14px] font-medium ${
                      have ? "text-text-primary" : "text-text-muted"
                    }`}
                  >
                    {ing}
                  </Text>
                </View>

                {have && (
                  <View className="px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-500/20">
                    <Text className="text-[11px] font-bold text-brand-500">
                      In stock
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Steps */}
      <View className="mb-6">
        <Text className="text-[12px] font-bold text-text-subtle uppercase tracking-widest mb-3">
          Steps
        </Text>
        <View className="gap-3">
          {recipe.steps.map((step, i) => (
            <View key={i} className="flex-row items-start gap-3">
              <View className="w-6 h-6 rounded-full bg-brand-500 items-center justify-center mt-0.5">
                <Text className="text-[12px] font-bold text-white">
                  {i + 1}
                </Text>
              </View>
              <Text className="flex-1 text-[14px] text-text-secondary leading-relaxed">
                {step}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Ready to Cook Celebration Card */}
      {haveAll && (
        <View className="p-4 bg-brand-50 dark:bg-brand-500/15 border border-brand-500/30 rounded-[20px] flex-row items-center gap-3">
          <Text className="text-3xl">🎉</Text>
          <View>
            <Text className="text-[15px] font-bold text-brand-500">
              Ready to cook!
            </Text>
            <Text className="text-[13px] text-brand-600 dark:text-brand-400 mt-0.5">
              You have all the ingredients in your kitchen.
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
