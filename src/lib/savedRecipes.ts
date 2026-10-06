import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { Recipe } from "@/src/types";

const STORAGE_PREFIX = "mealventory.savedRecipes";
const MAX_SAVED_RECIPES = 50;

function safeScopePart(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "_");
}

function scopePrefix(userId: string, householdId: string): string {
  return `${STORAGE_PREFIX}.${safeScopePart(userId)}.${safeScopePart(householdId)}`;
}

function indexKey(userId: string, householdId: string): string {
  return `${scopePrefix(userId, householdId)}.index`;
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function recipeSaveKey(recipe: Pick<Recipe, "name" | "uses">): string {
  const source = [
    recipe.name.trim().toLocaleLowerCase(),
    ...recipe.uses.map((item) => item.trim().toLocaleLowerCase()).sort(),
  ].join("|");
  return hashString(source);
}

function recipeKey(userId: string, householdId: string, saveKey: string): string {
  return `${scopePrefix(userId, householdId)}.${saveKey}`;
}

async function readValue(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    const storage = (globalThis as any)?.localStorage;
    return storage?.getItem?.(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function writeValue(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    const storage = (globalThis as any)?.localStorage;
    storage?.setItem?.(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteValue(key: string): Promise<void> {
  if (Platform.OS === "web") {
    const storage = (globalThis as any)?.localStorage;
    storage?.removeItem?.(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

async function loadIndex(userId: string, householdId: string): Promise<string[]> {
  try {
    const raw = await readValue(indexKey(userId, householdId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== "object") return false;
  const recipe = value as Partial<Recipe>;
  return (
    typeof recipe.id === "string" &&
    typeof recipe.name === "string" &&
    typeof recipe.time === "string" &&
    typeof recipe.difficulty === "string" &&
    typeof recipe.match === "number" &&
    Array.isArray(recipe.uses) &&
    typeof recipe.emoji === "string" &&
    typeof recipe.tag === "string" &&
    typeof recipe.description === "string" &&
    Array.isArray(recipe.steps)
  );
}

export async function loadSavedRecipes(
  userId: string,
  householdId: string
): Promise<Recipe[]> {
  const keys = await loadIndex(userId, householdId);
  const recipes: Recipe[] = [];
  const validKeys: string[] = [];

  for (const key of keys.slice(0, MAX_SAVED_RECIPES)) {
    try {
      const raw = await readValue(recipeKey(userId, householdId, key));
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!isRecipe(parsed)) continue;
      recipes.push(parsed);
      validKeys.push(key);
    } catch {
      // Corrupt or unavailable records are skipped instead of breaking Recipes.
    }
  }

  if (validKeys.length !== keys.length) {
    await writeValue(indexKey(userId, householdId), JSON.stringify(validKeys));
  }

  return recipes;
}

export async function saveRecipe(
  userId: string,
  householdId: string,
  recipe: Recipe
): Promise<void> {
  const key = recipeSaveKey(recipe);
  await writeValue(recipeKey(userId, householdId, key), JSON.stringify(recipe));
  const existing = await loadIndex(userId, householdId);
  const next = [key, ...existing.filter((value) => value !== key)].slice(
    0,
    MAX_SAVED_RECIPES
  );
  await writeValue(indexKey(userId, householdId), JSON.stringify(next));

  for (const stale of existing.slice(MAX_SAVED_RECIPES - 1)) {
    if (!next.includes(stale)) {
      await deleteValue(recipeKey(userId, householdId, stale));
    }
  }
}

export async function removeSavedRecipe(
  userId: string,
  householdId: string,
  recipe: Pick<Recipe, "name" | "uses">
): Promise<void> {
  const key = recipeSaveKey(recipe);
  const existing = await loadIndex(userId, householdId);
  const next = existing.filter((value) => value !== key);
  await writeValue(indexKey(userId, householdId), JSON.stringify(next));
  await deleteValue(recipeKey(userId, householdId, key));
}
