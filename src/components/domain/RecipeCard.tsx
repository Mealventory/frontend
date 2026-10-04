import React from "react";
import { TouchableOpacity, View, Text, Pressable } from "react-native";
import { Icon } from "@/src/components/atoms/Icon";
import { Recipe } from "@/src/types";

export interface RecipeCardProps {
  recipe: Recipe;
  inventoryItemNames: Set<string>;
  onPress: (recipe: Recipe) => void;
  saved?: boolean;
  onToggleSaved?: (recipe: Recipe) => void | Promise<void>;
  className?: string;
}

export function RecipeCard({
  recipe,
  inventoryItemNames,
  onPress,
  saved = false,
  onToggleSaved,
  className = "",
}: RecipeCardProps) {
  const haveCount = recipe.uses.filter((u) =>
    inventoryItemNames.has(u.toLowerCase())
  ).length;
  const pct = Math.round((haveCount / Math.max(1, recipe.uses.length)) * 100);
  const isHighMatch = pct >= 90;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${recipe.name}, ${pct}% match, ${haveCount} of ${recipe.uses.length} ingredients in stock, ${recipe.time}. Open recipe`}
      activeOpacity={0.7}
      onPress={() => onPress(recipe)}
      className={`p-4 bg-ground-surface dark:bg-ground-card rounded-[22px] border border-border-default shadow-sm ${className}`}
    >
      <View className="flex-row items-start">
        <View className="w-12 h-12 rounded-[16px] bg-ground-subtle dark:bg-ground-elevated items-center justify-center mr-3">
          <Text className="text-2xl">{recipe.emoji}</Text>
        </View>

        <View className="flex-1 min-w-0">
          <View className="flex-row items-start justify-between gap-2">
            <Text
              numberOfLines={2}
              className="text-[15px] font-bold text-text-primary flex-1 leading-tight"
            >
              {recipe.name}
            </Text>

            <View className="flex-row items-center gap-2">
              {onToggleSaved && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: saved }}
                  accessibilityLabel={saved ? `Remove ${recipe.name} from saved recipes` : `Save ${recipe.name}`}
                  onPress={(event) => {
                    event.stopPropagation?.();
                    void onToggleSaved(recipe);
                  }}
                  className={`w-11 h-11 rounded-full border items-center justify-center ${
                    saved
                      ? "bg-brand-500 border-brand-500"
                      : "bg-ground-subtle dark:bg-ground-elevated border-border-default"
                  }`}
                >
                  <Icon
                    name="Heart"
                    size={15}
                    color={saved ? "#FFFFFF" : "#64748B"}
                    strokeWidth={saved ? 2.8 : 2}
                  />
                </Pressable>
              )}

              <View
                className={`px-2.5 py-0.5 rounded-full border ${
                  isHighMatch
                    ? "bg-brand-50 border-brand-500/30 dark:bg-brand-500/20"
                    : "bg-ground-subtle border-border-default"
                }`}
              >
                <Text
                  className={`text-[13px] font-bold ${
                    isHighMatch ? "text-brand-500" : "text-text-muted"
                  }`}
                >
                  {pct}%
                </Text>
              </View>
            </View>
          </View>

          <Text className="text-[12px] font-regular text-text-muted mt-1">
            {recipe.tag} · {recipe.time}
          </Text>

          <View className="flex-row items-center gap-2 mt-2.5">
            <View className="flex-1 h-1.5 bg-ground-subtle dark:bg-ground-elevated rounded-full overflow-hidden">
              <View
                className="h-full bg-brand-500 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </View>
            <Text className="text-[11px] font-semibold text-text-muted">
              {haveCount}/{recipe.uses.length}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
