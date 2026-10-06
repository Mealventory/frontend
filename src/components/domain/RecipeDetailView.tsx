import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Recipe } from "@/src/types";
import { APP_GUTTER, APP_PAGE_TOP } from "@/src/lib/layout";
import { Icon } from "../atoms/Icon";

export interface RecipeDetailViewProps {
  recipe: Recipe;
  inventoryItemNames: Set<string>;
  onBack: () => void;
  saved?: boolean;
  onToggleSaved?: () => void | Promise<void>;
  onStartCooking?: () => void;
  onPlanMeal?: () => void;
  onAddMissingIngredients?: (
    ingredients: string[]
  ) => Promise<{ added: number; skipped: number }>;
}

export function RecipeDetailView({
  recipe,
  inventoryItemNames,
  onBack,
  saved = false,
  onToggleSaved,
  onStartCooking,
  onPlanMeal,
  onAddMissingIngredients,
}: RecipeDetailViewProps) {
  const [shoppingBusy, setShoppingBusy] = useState(false);
  const [shoppingNotice, setShoppingNotice] = useState("");
  const [shoppingError, setShoppingError] = useState("");

  const { missingIngredients, match } = useMemo(() => {
    const missing = recipe.uses.filter(
      (ingredient) => !inventoryItemNames.has(ingredient.toLowerCase())
    );
    const have = recipe.uses.length - missing.length;
    return {
      missingIngredients: missing,
      match: Math.round((have / Math.max(1, recipe.uses.length)) * 100),
    };
  }, [inventoryItemNames, recipe.uses]);

  const haveAll = missingIngredients.length === 0;

  const addMissing = async () => {
    if (!onAddMissingIngredients || missingIngredients.length === 0 || shoppingBusy) return;
    setShoppingBusy(true);
    setShoppingError("");
    setShoppingNotice("");
    try {
      const result = await onAddMissingIngredients(missingIngredients);
      if (result.added === 0 && result.skipped > 0) {
        setShoppingNotice("Those ingredients are already on your shopping list.");
      } else {
        const addedText = `${result.added} ${result.added === 1 ? "ingredient" : "ingredients"} added to Shopping.`;
        const skippedText = result.skipped
          ? ` ${result.skipped} already ${result.skipped === 1 ? "was" : "were"} on the list.`
          : "";
        setShoppingNotice(addedText + skippedText);
      }
    } catch (error) {
      setShoppingError(
        error instanceof Error
          ? error.message
          : "Could not add ingredients to the shopping list."
      );
    } finally {
      setShoppingBusy(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: APP_GUTTER, paddingTop: APP_PAGE_TOP, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      className="flex-1"
    >
      <View className="flex-row items-center gap-3 mb-4">
        <TouchableOpacity
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Back to recipes"
          onPress={onBack}
          className="w-11 h-11 rounded-[14px] bg-ground-subtle dark:bg-ground-elevated items-center justify-center border border-border-default"
        >
          <Icon name="ArrowLeft" size={18} />
        </TouchableOpacity>
        <Text className="text-[17px] font-bold text-text-primary flex-1">
          Recipe
        </Text>
        {onToggleSaved && (
          <TouchableOpacity
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: saved }}
            accessibilityLabel={saved ? "Remove from household saved recipes" : "Save recipe for household"}
            onPress={() => void onToggleSaved()}
            className={`w-11 h-11 rounded-[14px] border items-center justify-center ${
              saved
                ? "bg-brand-500 border-brand-500"
                : "bg-ground-subtle dark:bg-ground-elevated border-border-default"
            }`}
          >
            <Icon
              name="Heart"
              size={18}
              color={saved ? "#FFFFFF" : "#64748B"}
              strokeWidth={saved ? 2.8 : 2}
            />
          </TouchableOpacity>
        )}
      </View>

      <View className="h-[150px] rounded-[24px] bg-brand-50 dark:bg-brand-500/15 border border-brand-500/20 items-center justify-center mb-5">
        <Text className="text-[72px]">{recipe.emoji}</Text>
      </View>

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
            {match}%
          </Text>
        </View>
      </View>

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

      {recipe.priorityIngredients?.length ? (
        <Text className="text-brand-500 mb-3">
          Use soon: {recipe.priorityIngredients.join(", ")}
        </Text>
      ) : null}

      {(onStartCooking || onPlanMeal) && (
        <View className="gap-2 mb-6">
          {onStartCooking && (
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Start cooking ${recipe.name}`}
              onPress={onStartCooking}
              className="min-h-[56px] px-5 rounded-2xl bg-brand-500 flex-row items-center justify-center gap-2"
            >
              <Icon name="ChefHat" size={19} color="#FFFFFF" />
              <Text className="text-[16px] font-bold text-white">Start Cooking</Text>
            </TouchableOpacity>
          )}
          {onPlanMeal && (
            <TouchableOpacity
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Plan ${recipe.name}`}
              onPress={onPlanMeal}
              className="min-h-[50px] px-5 rounded-2xl border border-border-default bg-ground-surface dark:bg-ground-card flex-row items-center justify-center gap-2"
            >
              <Icon name="CalendarPlus" size={18} color="#10B981" />
              <Text className="text-[15px] font-bold text-text-primary">Add to Meal Plan</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View className="mb-6">
        <View className="flex-row items-end justify-between gap-3 mb-3">
          <View className="flex-1">
            <Text className="text-[12px] font-bold text-text-subtle uppercase tracking-widest">
              Ingredients
            </Text>
            <Text className="text-[12px] text-text-muted mt-1">
              {recipe.uses.length - missingIngredients.length} available · {missingIngredients.length} missing
            </Text>
          </View>
        </View>

        <View className="gap-2">
          {recipe.uses.map((ing) => {
            const have = inventoryItemNames.has(ing.toLowerCase());
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

                <View
                  className={`px-2.5 py-0.5 rounded-full ${
                    have
                      ? "bg-brand-50 dark:bg-brand-500/20"
                      : "bg-ground-subtle dark:bg-ground-elevated"
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      have ? "text-brand-500" : "text-text-muted"
                    }`}
                  >
                    {have ? "In stock" : "Missing"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {missingIngredients.length > 0 && onAddMissingIngredients && (
          <TouchableOpacity
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Add missing ingredients to shopping list"
            disabled={shoppingBusy}
            onPress={() => void addMissing()}
            className="min-h-[48px] mt-3 px-4 rounded-xl bg-brand-500 flex-row items-center justify-center gap-2"
            style={{ opacity: shoppingBusy ? 0.6 : 1 }}
          >
            {shoppingBusy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Icon name="ShoppingBasket" size={17} color="#FFFFFF" />
            )}
            <Text className="text-white font-bold">
              {shoppingBusy
                ? "Adding…"
                : `Add ${missingIngredients.length} Missing to Shopping`}
            </Text>
          </TouchableOpacity>
        )}

        {!!shoppingNotice && (
          <View
            accessibilityLiveRegion="polite"
            className="mt-3 p-3 rounded-xl bg-brand-50 dark:bg-brand-500/15 border border-brand-500/20"
          >
            <Text className="text-[12px] font-semibold text-brand-600 dark:text-brand-400">
              {shoppingNotice}
            </Text>
          </View>
        )}

        {!!shoppingError && (
          <View
            accessibilityRole="alert"
            className="mt-3 p-3 rounded-xl bg-urgency-critical-bg border border-urgency-critical/30"
          >
            <Text className="text-[12px] font-semibold text-urgency-critical">
              {shoppingError}
            </Text>
          </View>
        )}
      </View>

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

      {haveAll && (
        <View className="p-4 bg-brand-50 dark:bg-brand-500/15 border border-brand-500/30 rounded-[20px] flex-row items-center gap-3">
          <Text className="text-3xl">🎉</Text>
          <View className="flex-1">
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
