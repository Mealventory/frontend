import React, { useState, useEffect, useRef } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Button, Icon } from "@/src/components/atoms";
import { RecipeCard } from "@/src/components/domain/RecipeCard";
import { EmptyState } from "@/src/components/molecules/EmptyState";
import { useInventory } from "@/src/context/InventoryContext";
import { useAuth } from "@/src/context/AuthContext";
import { generateRecipes } from "@/src/lib/recipeApi";
import type { Recipe } from "@/src/types";

type RecipeView = "recommended" | "saved";

export default function RecipesTabScreen() {
  const router = useRouter();
  const {
    inventory,
    openRecipe,
    savedRecipes,
    savedRecipesLoading,
    isRecipeSaved,
    toggleSavedRecipe,
  } = useInventory();
  const { session, household } = useAuth();
  const scope = `${session?.user.id}:${household?.id}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const request = useRef<AbortController | null>(null);
  const [result, setResult] = useState<{ scope: string; recipes: Recipe[] } | null>(null);
  const [view, setView] = useState<RecipeView>("recommended");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setResult(null);
    setError("");
    setSaveError("");
    setBusy(false);
    setView("recommended");
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [scope]);

  const generate = async () => {
    if (!session || !household || request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    setResult(null);
    const timeout = setTimeout(() => controller.abort(), 75000);
    try {
      const generated = await generateRecipes(
        session.access_token,
        household.id,
        controller.signal
      );
      if (currentScope.current === scope && request.current === controller) {
        setResult({ scope, recipes: generated });
      }
    } catch (e) {
      if (currentScope.current === scope && request.current === controller) {
        setError(
          controller.signal.aborted
            ? "Recipe generation timed out. Please retry."
            : e instanceof Error
            ? e.message
            : "Could not generate recipes."
        );
      }
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  };

  const toggleSaved = async (recipe: Recipe) => {
    setSaveError("");
    try {
      await toggleSavedRecipe(recipe);
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Could not update saved recipes."
      );
    }
  };

  const generatedRecipes = result?.scope === scope ? result.recipes : [];
  const inventoryNames = new Set(
    inventory
      .filter((item) => !item.expiryDate || item.daysLeft >= 0)
      .map((item) => item.name.toLowerCase())
  );

  const open = (recipe: Recipe) => {
    openRecipe(recipe);
    router.push(`/(app)/recipes/${recipe.id}` as any);
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-ground-canvas"
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Typography variant="h1">Recipes</Typography>

        <View className="flex-row mt-4 mb-5 p-1 rounded-xl bg-ground-subtle dark:bg-ground-elevated">
          {(["recommended", "saved"] as RecipeView[]).map((tab) => {
            const selected = view === tab;
            const label =
              tab === "recommended"
                ? "Recommended"
                : `Saved${savedRecipes.length ? ` (${savedRecipes.length})` : ""}`;
            return (
              <Pressable
                key={tab}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setView(tab)}
                className={`flex-1 min-h-[44px] px-3 rounded-lg items-center justify-center ${
                  selected ? "bg-ground-surface dark:bg-ground-card" : ""
                }`}
              >
                <Text
                  className={`font-bold ${
                    selected
                      ? "text-brand-500"
                      : "text-text-muted"
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {!!saveError && (
          <View
            accessibilityRole="alert"
            className="mb-4 p-3 rounded-xl bg-urgency-critical-bg border border-urgency-critical/30"
          >
            <Typography variant="caption" className="text-urgency-critical">
              {saveError}
            </Typography>
          </View>
        )}

        {view === "recommended" ? (
          <>
            <View className="mb-5 p-5 rounded-3xl bg-brand-50 border border-brand-500/20">
              <Typography variant="h2">Good food, less waste</Typography>
              <Typography className="my-3">
                Turn your household pantry into dinner. We'll prioritize food
                dated today through the next three days, then use the rest of
                your pantry.
              </Typography>
              <Typography variant="caption" color="muted" className="mb-4">
                Past-date items are excluded. Check freshness and any dietary
                needs before cooking. Save anything you like so it stays here
                even when your pantry changes.
              </Typography>
              <Button
                label={busy ? "Finding ideas…" : "Find recipes for my pantry"}
                loading={busy}
                disabled={busy || !household}
                onPress={generate}
              />
            </View>

            {error ? <Typography className="mb-4">{error}</Typography> : null}

            {result?.scope === scope && generatedRecipes.length === 0 ? (
              <Typography>
                Add some active pantry items to get recipe ideas. Items without
                dates can be used too.
              </Typography>
            ) : null}

            <View className="gap-4">
              {generatedRecipes.map((recipe) => (
                <View key={recipe.id}>
                  <RecipeCard
                    recipe={recipe}
                    inventoryItemNames={inventoryNames}
                    saved={isRecipeSaved(recipe)}
                    onToggleSaved={toggleSaved}
                    onPress={open}
                  />
                  <Typography variant="caption" className="mt-2">
                    Use soon:{" "}
                    {recipe.priorityIngredients?.join(", ") ||
                      "No dated items due soon"}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    Extras to check:{" "}
                    {recipe.uses
                      .filter(
                        (ingredient) =>
                          !inventoryNames.has(ingredient.toLowerCase())
                      )
                      .join(", ") || "None"}
                  </Typography>
                </View>
              ))}
            </View>
          </>
        ) : savedRecipesLoading ? (
          <View className="items-center py-16 gap-3">
            <ActivityIndicator size="large" color="#10B981" />
            <Typography variant="caption" color="muted">
              Loading saved recipes…
            </Typography>
          </View>
        ) : savedRecipes.length === 0 ? (
          <EmptyState
            icon="Heart"
            title="No saved recipes yet"
            description="Save a recipe you like and it will stay easy to find even when your pantry changes."
            actionLabel="Browse recommendations"
            onAction={() => setView("recommended")}
          />
        ) : (
          <View className="gap-4">
            <View className="p-4 rounded-2xl bg-ground-surface dark:bg-ground-card border border-border-default">
              <View className="flex-row items-center gap-2">
                <Icon name="Heart" size={18} color="#10B981" />
                <Typography variant="body" className="font-bold">
                  Your saved collection
                </Typography>
              </View>
              <Typography variant="caption" color="muted" className="mt-1">
                Match percentages update against what is in your pantry now.
              </Typography>
            </View>

            {savedRecipes.map((recipe) => {
              const missing = recipe.uses.filter(
                (ingredient) => !inventoryNames.has(ingredient.toLowerCase())
              );
              return (
                <View key={`${recipe.id}-saved`}>
                  <RecipeCard
                    recipe={recipe}
                    inventoryItemNames={inventoryNames}
                    saved
                    onToggleSaved={toggleSaved}
                    onPress={open}
                  />
                  <Typography
                    variant="caption"
                    color={missing.length ? "muted" : "fresh"}
                    className="mt-2"
                  >
                    {missing.length
                      ? `Missing now: ${missing.join(", ")}`
                      : "You currently have every listed ingredient."}
                  </Typography>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
