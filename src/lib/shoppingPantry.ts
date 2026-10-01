import type { StorageZone } from "../types";
import type { NewItem } from "./inventoryApi";
import { predictExpiry, type FoodState, type Prediction } from "./expiryPredictionApi";
import type { ShoppingItem } from "./shoppingApi";

type PredictExpiry = (
  token: string,
  household: string,
  input: {
    name: string;
    storage_zone: string;
    purchase_date: string;
    item_id?: string;
    avg_shelf_life_days?: number;
    food_state?: FoodState;
  },
  signal: AbortSignal
) => Promise<Prediction>;

const frozenWords = /\b(frozen|ice cream|popsicle|freezer)\b/i;
const spiceWords = /\b(spice|seasoning|paprika|cumin|oregano|thyme|cinnamon|nutmeg)\b/i;
const chilledWords =
  /\b(milk|cream|yogurt|cheese|butter|egg|eggs|chicken|beef|steak|pork|turkey|fish|salmon|shrimp|seafood|tofu|spinach|lettuce|deli|ham|sausage)\b/i;

export function suggestedStorageZone(name: string): StorageZone {
  if (frozenWords.test(name)) return "freezer";
  if (spiceWords.test(name)) return "spicerack";
  if (chilledWords.test(name)) return "fridge";
  return "pantry";
}

function categoryForZone(zone: StorageZone) {
  if (zone === "freezer") return "Frozen";
  if (zone === "fridge") return "Refrigerated";
  if (zone === "spicerack") return "Spices";
  return "Pantry";
}

function preferredFoodState(options?: FoodState[]): FoodState | undefined {
  if (!options?.length) return undefined;
  const preferred: FoodState[] = [
    "unopened",
    "whole",
    "raw",
    "ready_to_eat",
    "cooked",
    "opened",
  ];
  return preferred.find((state) => options.includes(state)) ?? options[0];
}

export async function preparePurchasedInventoryItems(
  token: string,
  householdId: string,
  purchased: ShoppingItem[],
  options: {
    predict?: PredictExpiry;
    signal?: AbortSignal;
    purchaseDate?: string;
  } = {}
): Promise<{ items: NewItem[]; withoutExpiry: number }> {
  const predict = options.predict ?? predictExpiry;
  const signal = options.signal ?? new AbortController().signal;
  const purchaseDate = options.purchaseDate ?? new Date().toISOString().slice(0, 10);
  const items: NewItem[] = [];
  let withoutExpiry = 0;

  for (const shoppingItem of purchased) {
    const zone = suggestedStorageZone(shoppingItem.name);
    let expiryDate: string | null = null;

    try {
      let prediction = await predict(
        token,
        householdId,
        {
          name: shoppingItem.name,
          storage_zone: zone,
          purchase_date: purchaseDate,
        },
        signal
      );

      if (!prediction.predicted_expiry_date) {
        const foodState = preferredFoodState(prediction.food_state_options);
        if (foodState) {
          prediction = await predict(
            token,
            householdId,
            {
              name: shoppingItem.name,
              storage_zone: zone,
              purchase_date: purchaseDate,
              food_state: foodState,
            },
            signal
          );
        }
      }

      expiryDate = prediction.predicted_expiry_date ?? null;
    } catch {
      expiryDate = null;
    }

    if (!expiryDate) withoutExpiry += 1;

    const quantity = Number(shoppingItem.quantity);
    items.push({
      name: shoppingItem.name.trim(),
      category: categoryForZone(zone),
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unit: shoppingItem.unit?.trim() || "units",
      expiry_date: expiryDate,
      storage_zone: zone,
    });
  }

  return { items, withoutExpiry };
}
