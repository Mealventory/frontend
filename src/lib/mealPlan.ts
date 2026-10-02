import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { FoodItem, Recipe } from "../types";

export type MealSlot = "lunch" | "dinner";

export interface PlannedMeal {
  date: string;
  slot: MealSlot;
  recipe: Recipe;
}

const STORAGE_PREFIX = "mealventory.mealPlan";
const MAX_PLANNED_MEALS = 180;

function safeScopePart(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "_");
}

function scopePrefix(userId: string, householdId: string): string {
  return `${STORAGE_PREFIX}.${safeScopePart(userId)}.${safeScopePart(householdId)}`;
}

function indexKey(userId: string, householdId: string): string {
  return `${scopePrefix(userId, householdId)}.index`;
}

function entryKey(
  userId: string,
  householdId: string,
  date: string,
  slot: MealSlot
): string {
  return `${scopePrefix(userId, householdId)}.${safeScopePart(date)}.${slot}`;
}

export function mealSlotKey(date: string, slot: MealSlot): string {
  return `${date}:${slot}`;
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function startOfWeek(date = new Date()): Date {
  const result = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0
  );
  const day = result.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + offset);
  return result;
}

export function shiftWeek(weekStart: Date, amount: number): Date {
  const result = new Date(weekStart);
  result.setDate(result.getDate() + amount * 7);
  return startOfWeek(result);
}

export function weekDates(weekStart: Date): Date[] {
  const monday = startOfWeek(weekStart);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

export function mealsForWeek(
  meals: PlannedMeal[],
  weekStart: Date
): PlannedMeal[] {
  const keys = new Set(weekDates(weekStart).map(localDateKey));
  return meals.filter((meal) => keys.has(meal.date));
}

export type MealReadinessStatus = "ready" | "low" | "missing";

export interface MealIngredientReadiness {
  status: MealReadinessStatus;
  matchPercent: number;
  missingIngredients: string[];
  shoppingCoveredIngredients: string[];
  unresolvedIngredients: string[];
}

type IngredientNameSource = Array<{ name: string }> | Set<string>;

function normalizedNameSet(source: IngredientNameSource): Set<string> {
  const values =
    source instanceof Set
      ? [...source]
      : source.map((item) => item.name);

  return new Set(
    values
      .map((name) => name.trim().toLocaleLowerCase())
      .filter(Boolean)
  );
}

export function mealIngredientReadiness(
  recipe: Pick<Recipe, "uses">,
  inventory: IngredientNameSource,
  shopping: IngredientNameSource = new Set<string>()
): MealIngredientReadiness {
  const inventoryNames = normalizedNameSet(inventory);
  const shoppingNames = normalizedNameSet(shopping);
  const listedIngredients = recipe.uses
    .map((ingredient) => ingredient.trim())
    .filter(Boolean);

  if (listedIngredients.length === 0) {
    return {
      status: "ready",
      matchPercent: 100,
      missingIngredients: [],
      shoppingCoveredIngredients: [],
      unresolvedIngredients: [],
    };
  }

  const missing = new Map<string, string>();
  let availableCount = 0;

  for (const ingredient of listedIngredients) {
    const key = ingredient.toLocaleLowerCase();
    if (inventoryNames.has(key)) {
      availableCount += 1;
    } else if (!missing.has(key)) {
      missing.set(key, ingredient);
    }
  }

  const missingIngredients = [...missing.values()];
  const shoppingCoveredIngredients = missingIngredients.filter((ingredient) =>
    shoppingNames.has(ingredient.toLocaleLowerCase())
  );
  const unresolvedIngredients = missingIngredients.filter(
    (ingredient) => !shoppingNames.has(ingredient.toLocaleLowerCase())
  );

  return {
    status:
      missingIngredients.length === 0
        ? "ready"
        : availableCount > 0
          ? "low"
          : "missing",
    matchPercent: Math.round(
      (availableCount / listedIngredients.length) * 100
    ),
    missingIngredients,
    shoppingCoveredIngredients,
    unresolvedIngredients,
  };
}

export function mealMatchPercent(
  recipe: Pick<Recipe, "uses">,
  inventory: Array<Pick<FoodItem, "name">> | Set<string>
): number {
  return mealIngredientReadiness(recipe, inventory).matchPercent;
}

export function weeklyMissingIngredients(
  meals: PlannedMeal[],
  inventory: Array<Pick<FoodItem, "name">> | Set<string>
): string[] {
  const names = normalizedNameSet(inventory);
  const missing = new Map<string, string>();

  for (const meal of meals) {
    for (const ingredient of meal.recipe.uses) {
      const name = ingredient.trim();
      const key = name.toLocaleLowerCase();
      if (name && !names.has(key) && !missing.has(key)) {
        missing.set(key, name);
      }
    }
  }

  return [...missing.values()];
}

function dateKeyOrdinal(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  return Number.isFinite(timestamp) ? Math.floor(timestamp / 86_400_000) : null;
}

export function isMealDateWithinWarningWindow(
  mealDate: string,
  today = new Date(),
  leadDays = 2
): boolean {
  const mealOrdinal = dateKeyOrdinal(mealDate);
  const todayOrdinal = dateKeyOrdinal(localDateKey(today));
  if (mealOrdinal === null || todayOrdinal === null) return false;
  const distance = mealOrdinal - todayOrdinal;
  return distance >= 0 && distance <= Math.max(0, leadDays);
}

export interface UpcomingMealReadinessWarning {
  meal: PlannedMeal;
  readiness: MealIngredientReadiness;
}

export function upcomingMealReadinessWarnings(
  meals: PlannedMeal[],
  inventory: IngredientNameSource,
  shopping: IngredientNameSource,
  today = new Date(),
  leadDays = 2
): UpcomingMealReadinessWarning[] {
  return meals.flatMap((meal) => {
    if (!isMealDateWithinWarningWindow(meal.date, today, leadDays)) return [];
    const readiness = mealIngredientReadiness(
      meal.recipe,
      inventory,
      shopping
    );
    return readiness.unresolvedIngredients.length > 0
      ? [{ meal, readiness }]
      : [];
  });
}

export function applyMealMove(
  meals: PlannedMeal[],
  sourceDate: string,
  sourceSlot: MealSlot,
  targetDate: string,
  targetSlot: MealSlot
): PlannedMeal[] {
  if (sourceDate === targetDate && sourceSlot === targetSlot) return meals;

  const sourceKey = mealSlotKey(sourceDate, sourceSlot);
  const targetKey = mealSlotKey(targetDate, targetSlot);
  const source = meals.find(
    (meal) => mealSlotKey(meal.date, meal.slot) === sourceKey
  );
  if (!source) return meals;

  const target = meals.find(
    (meal) => mealSlotKey(meal.date, meal.slot) === targetKey
  );
  const remaining = meals.filter((meal) => {
    const key = mealSlotKey(meal.date, meal.slot);
    return key !== sourceKey && key !== targetKey;
  });

  const next: PlannedMeal[] = [
    ...remaining,
    { ...source, date: targetDate, slot: targetSlot },
  ];

  if (target) {
    next.push({ ...target, date: sourceDate, slot: sourceSlot });
  }

  return next;
}

function isMealSlot(value: unknown): value is MealSlot {
  return value === "lunch" || value === "dinner";
}

function isRecipe(value: unknown): value is Recipe {
  if (!value || typeof value !== "object") return false;
  const recipe = value as Partial<Recipe>;
  return (
    typeof recipe.id === "string" &&
    typeof recipe.name === "string" &&
    typeof recipe.time === "string" &&
    (recipe.difficulty === "Easy" ||
      recipe.difficulty === "Medium" ||
      recipe.difficulty === "Hard") &&
    typeof recipe.match === "number" &&
    Array.isArray(recipe.uses) &&
    recipe.uses.every((item) => typeof item === "string") &&
    typeof recipe.emoji === "string" &&
    typeof recipe.tag === "string" &&
    typeof recipe.description === "string" &&
    Array.isArray(recipe.steps) &&
    recipe.steps.every((item) => typeof item === "string")
  );
}

function isPlannedMeal(value: unknown): value is PlannedMeal {
  if (!value || typeof value !== "object") return false;
  const meal = value as Partial<PlannedMeal>;
  return (
    typeof meal.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(meal.date) &&
    isMealSlot(meal.slot) &&
    isRecipe(meal.recipe)
  );
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

function parseSlotKey(key: string): { date: string; slot: MealSlot } | null {
  const split = key.lastIndexOf(":");
  if (split < 0) return null;
  const date = key.slice(0, split);
  const slot = key.slice(split + 1);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && isMealSlot(slot)
    ? { date, slot }
    : null;
}

export async function loadMealPlan(
  userId: string,
  householdId: string
): Promise<PlannedMeal[]> {
  const keys = await loadIndex(userId, householdId);
  const meals: PlannedMeal[] = [];
  const validKeys: string[] = [];

  for (const key of keys.slice(0, MAX_PLANNED_MEALS)) {
    const parsedKey = parseSlotKey(key);
    if (!parsedKey) continue;
    try {
      const raw = await readValue(
        entryKey(userId, householdId, parsedKey.date, parsedKey.slot)
      );
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!isPlannedMeal(parsed)) continue;
      meals.push(parsed);
      validKeys.push(key);
    } catch {
      // Corrupt records are skipped instead of blocking the planner.
    }
  }

  if (validKeys.length !== keys.length) {
    await writeValue(indexKey(userId, householdId), JSON.stringify(validKeys));
  }

  return meals;
}

export async function savePlannedMeal(
  userId: string,
  householdId: string,
  meal: PlannedMeal
): Promise<void> {
  const key = mealSlotKey(meal.date, meal.slot);
  await writeValue(
    entryKey(userId, householdId, meal.date, meal.slot),
    JSON.stringify(meal)
  );
  const existing = await loadIndex(userId, householdId);
  const next = [key, ...existing.filter((value) => value !== key)].slice(
    0,
    MAX_PLANNED_MEALS
  );
  await writeValue(indexKey(userId, householdId), JSON.stringify(next));

  for (const stale of existing.slice(MAX_PLANNED_MEALS - 1)) {
    if (next.includes(stale)) continue;
    const parsed = parseSlotKey(stale);
    if (parsed) {
      await deleteValue(
        entryKey(userId, householdId, parsed.date, parsed.slot)
      );
    }
  }
}

export async function removePlannedMeal(
  userId: string,
  householdId: string,
  date: string,
  slot: MealSlot
): Promise<void> {
  const key = mealSlotKey(date, slot);
  const existing = await loadIndex(userId, householdId);
  await writeValue(
    indexKey(userId, householdId),
    JSON.stringify(existing.filter((value) => value !== key))
  );
  await deleteValue(entryKey(userId, householdId, date, slot));
}

export async function movePlannedMeal(
  userId: string,
  householdId: string,
  sourceDate: string,
  sourceSlot: MealSlot,
  targetDate: string,
  targetSlot: MealSlot
): Promise<PlannedMeal[]> {
  const current = await loadMealPlan(userId, householdId);
  const next = applyMealMove(
    current,
    sourceDate,
    sourceSlot,
    targetDate,
    targetSlot
  );

  const sourceKey = mealSlotKey(sourceDate, sourceSlot);
  const targetKey = mealSlotKey(targetDate, targetSlot);
  const changedKeys = new Set([sourceKey, targetKey]);

  for (const key of changedKeys) {
    const parsed = parseSlotKey(key);
    if (parsed) {
      await deleteValue(
        entryKey(userId, householdId, parsed.date, parsed.slot)
      );
    }
  }

  const existingIndex = await loadIndex(userId, householdId);
  const nextIndex = existingIndex.filter((key) => !changedKeys.has(key));

  for (const meal of next.filter((item) => {
    const key = mealSlotKey(item.date, item.slot);
    return changedKeys.has(key);
  })) {
    const key = mealSlotKey(meal.date, meal.slot);
    await writeValue(
      entryKey(userId, householdId, meal.date, meal.slot),
      JSON.stringify(meal)
    );
    nextIndex.unshift(key);
  }

  await writeValue(
    indexKey(userId, householdId),
    JSON.stringify([...new Set(nextIndex)].slice(0, MAX_PLANNED_MEALS))
  );

  return next;
}
