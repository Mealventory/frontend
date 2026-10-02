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
  expiryDate?: string | null;
  id: string;
  name: string;
  category: string;
  expDate: string;
  daysLeft: number;
  quantity: string;
  quantityTrackingEnabled?: boolean;
  initialQuantity?: number | null;
  lowStockThresholdPercent?: number;
  remainingPercent?: number | null;
  isLowStock?: boolean;
  emoji: string;
  storageZone?: StorageZone;
  barcode?: string;
}

export interface Recipe {
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
