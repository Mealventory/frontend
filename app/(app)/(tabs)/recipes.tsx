import React, { useState, useEffect, useRef } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Typography, Button } from "@/src/components/atoms";
import { RecipeCard } from "@/src/components/domain/RecipeCard";
import { useInventory } from "@/src/context/InventoryContext";
import { useAuth } from "@/src/context/AuthContext";
import { generateRecipes } from "@/src/lib/recipeApi";
import type { Recipe } from "@/src/types";

export default function RecipesTabScreen() {
  const router = useRouter();
  const { inventory, openRecipe } = useInventory();
  const { session, household } = useAuth();
  const scope = `${session?.user.id}:${household?.id}`;
  const currentScope = useRef(scope); currentScope.current = scope;
  const request = useRef<AbortController | null>(null);
  const [result, setResult] = useState<{scope: string; recipes: Recipe[]} | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setResult(null); setError(''); setBusy(false);
    return () => { request.current?.abort(); request.current = null; };
  }, [scope]);
  const generate = async () => {
    if (!session || !household || request.current) return;
    const controller = new AbortController(); request.current = controller;
    setBusy(true); setError(''); setResult(null);
    const timeout = setTimeout(() => controller.abort(), 75000);
    try {
      const recipes = await generateRecipes(session.access_token, household.id, controller.signal);
      if (currentScope.current === scope && request.current === controller) setResult({scope, recipes});
    } catch (e) {
      if (currentScope.current === scope && request.current === controller) setError(controller.signal.aborted ? 'Recipe generation timed out. Please retry.' : e instanceof Error ? e.message : 'Could not generate recipes.');
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) { request.current = null; setBusy(false); }
    }
  };
  const recipes = result?.scope === scope ? result.recipes : [];
  const names = new Set(inventory.filter(i => !i.expiryDate || i.daysLeft >= 0).map(i => i.name.toLowerCase()));
  return <SafeAreaView edges={["top", "left", "right"]} className="flex-1 bg-ground-canvas">
    <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 40}}>
      <Typography variant="h1">Recipes</Typography>
      <View className="my-5 p-5 rounded-3xl bg-brand-50 border border-brand-500/20">
        <Typography variant="h2">Good food, less waste</Typography>
        <Typography className="my-3">Turn your household pantry into dinner. We'll prioritize food dated today through the next three days, then use the rest of your pantry.</Typography>
        <Typography variant="caption" color="muted" className="mb-4">Past-date items are excluded. Check freshness and any dietary needs before cooking. Extras are listed separately.</Typography>
        <Button label={busy ? 'Finding ideas…' : 'Find recipes for my pantry'} loading={busy} disabled={busy || !household} onPress={generate} />
      </View>
      {error ? <Typography className="mb-4">{error}</Typography> : null}
      {result?.scope === scope && recipes.length === 0 ? <Typography>Add some active pantry items to get recipe ideas. Items without dates can be used too.</Typography> : null}
      <View className="gap-4">{recipes.map(recipe => <View key={recipe.id}>
        <RecipeCard recipe={recipe} inventoryItemNames={names} onPress={r => {openRecipe(r); router.push(`/(app)/recipes/${r.id}` as any);}} />
        <Typography variant="caption" className="mt-2">Use soon: {recipe.priorityIngredients?.join(', ') || 'No dated items due soon'}</Typography>
        <Typography variant="caption" color="muted">Extras to check: {recipe.missingIngredients?.join(', ') || 'None'}</Typography>
      </View>)}</View>
    </ScrollView>
  </SafeAreaView>;
}
