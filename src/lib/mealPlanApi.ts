import type { Recipe } from "../types";
import { mealSlotKey, validMealDate, type MealSlot, type PlannedMeal } from "./mealPlan";

export { validMealDate };

const base = (
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  ""
).replace(/\/$/, "");

export type SharedMealPlanState = {
  meals: Array<PlannedMeal & { revision: number }>;
  slot_versions: Record<string, number>;
  imported_local_plan: boolean;
};

export type ImportCandidate = {
  date: string;
  slot: MealSlot;
  revision: number;
  status: "available" | "occupied";
};

export type MealImportPreview = {
  candidates: ImportCandidate[];
  imported_local_plan: boolean;
};

type MealImportEntry = PlannedMeal & { expected_revision: number };
type MealImportRequest = { import_key: "local-v1"; meals: MealImportEntry[] };

export class MealPlanConflictError extends Error {
  constructor() {
    super("The shared meal plan changed on another device. Refresh and review your change.");
    this.name = "MealPlanConflictError";
  }
}

// The backend RecipeSnapshot rejects unrelated client fields such as servings.
export function recipeSnapshot(recipe: Recipe): Recipe {
  const {
    id, name, time, difficulty, match, uses, emoji, tag,
    description, steps, priorityIngredients, missingIngredients,
  } = recipe;
  return {
    id, name, time, difficulty, match, uses, emoji, tag,
    description, steps,
    ...(priorityIngredients ? { priorityIngredients } : {}),
    ...(missingIngredients ? { missingIngredients } : {}),
  };
}

async function request<T>(
  token: string, householdId: string, path = "", body?: unknown, method = "GET"
): Promise<T> {
  if (!base) throw new Error("The backend connection is not configured.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${base}/api/v1/meal-plan${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Household-ID": householdId,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error("Please sign in again.");
      if (response.status === 403) throw new Error("You no longer have access to this household.");
      if (response.status === 409) throw new MealPlanConflictError();
      if (response.status === 422) throw new Error("An invalid date or recipe prevented saving.");
      throw new Error("Could not sync the household meal plan. Refresh and try again.");
    }
    return await response.json() as T;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Meal plan request timed out. Refresh before retrying; the change may have saved.");
    }
    if (error instanceof TypeError) {
      throw new Error("Could not reach the meal planning service. Check your connection.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function listSharedMealPlan(token: string, householdId: string) {
  return request<SharedMealPlanState>(token, householdId);
}

export function assignSharedMeal(
  token: string, householdId: string, meal: PlannedMeal, expectedRevision: number
) {
  mealSlotKey(meal.date, meal.slot);
  return request<SharedMealPlanState>(token, householdId, "/slots", {
    ...meal, recipe: recipeSnapshot(meal.recipe), expected_revision: expectedRevision,
  }, "PUT");
}

export function moveSharedMeal(
  token: string, householdId: string,
  sourceDate: string, sourceSlot: MealSlot,
  targetDate: string, targetSlot: MealSlot,
  sourceRevision: number, targetRevision: number
) {
  mealSlotKey(sourceDate, sourceSlot);
  mealSlotKey(targetDate, targetSlot);
  return request<SharedMealPlanState>(token, householdId, "/move", {
    source_date: sourceDate, source_slot: sourceSlot,
    target_date: targetDate, target_slot: targetSlot,
    source_revision: sourceRevision, target_revision: targetRevision,
  }, "POST");
}

export function removeSharedMeal(
  token: string, householdId: string,
  date: string, slot: MealSlot, expectedRevision: number
) {
  mealSlotKey(date, slot);
  return request<SharedMealPlanState>(token, householdId, "/slots/remove", {
    date, slot, expected_revision: expectedRevision,
  }, "POST");
}

export function importPayload(meals: MealImportEntry[]): MealImportRequest {
  return {
    import_key: "local-v1",
    meals: meals.filter(meal => {
      try {
        mealSlotKey(meal.date, meal.slot);
        return true;
      } catch {
        return false;
      }
    }).map(meal => ({
      ...meal, recipe: recipeSnapshot(meal.recipe),
    })),
  };
}

export function previewLocalMealImport(
  token: string, householdId: string, payload: MealImportRequest
) {
  return request<MealImportPreview>(token, householdId, "/import/preview", payload, "POST");
}

export function importLocalMealPlan(
  token: string, householdId: string, payload: MealImportRequest
) {
  return request<SharedMealPlanState>(token, householdId, "/import", payload, "POST");
}
