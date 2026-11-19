export type UrgencyStatus = "critical" | "soon" | "fresh" | "frozen";

export type StorageZone = "pantry" | "fridge" | "freezer" | "spicerack";

export type FoodCategory =
  | "All"
  | "Produce"
  | "Dairy"
  | "Meat"
  | "Bakery"
  | "Pantry"
  | "Beverage"
  | "Snacks";

export interface FoodItem {
  /** Current server-side revision for household inventory edits. */
  version?: number;
  expiryDate?: string | null;
  id: string;
  name: string;
  category: string;
  expDate: string;
  daysLeft: number;
  quantity: string;
  remainingPercent?: number | null;
  isLowStock?: boolean;
  emoji: string;
  storageZone?: StorageZone;
  barcode?: string;
  imageRef?: string | null;
}

export interface Recipe {
  /** Marks a user-authored recipe so it can be edited in the household collection. */
  origin?: "custom";
  /** Optional recipe yield. Older generated and saved recipes may omit it. */
  servings?: number;
  priorityIngredients?: string[];
  missingIngredients?: string[];
  id: string;
  name: string;
  time: string;
  difficulty: "Easy" | "Medium" | "Hard";
  match: number;
  uses: string[];
  emoji: string;
  tag: string;
  description: string;
  steps: string[];
}
