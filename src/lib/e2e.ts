import type { Session } from "@supabase/supabase-js";
import type { Household, Member } from "@/src/lib/householdApi";
import type { ScannedItem } from "@/src/lib/scanApi";

export const E2E_ENABLED = process.env.EXPO_PUBLIC_E2E_MODE === "1";

export const E2E_EMAIL = "e2e@mealventory.test";
export const E2E_PASSWORD = "MealventoryE2E!";
export const E2E_USER_ID = "00000000-0000-4000-8000-000000000059";
export const E2E_HOUSEHOLD_ID = "00000000-0000-4000-8000-000000000159";
export const E2E_MANUAL_ITEM_NAME = "E2E Apples";
export const E2E_EDITED_ITEM_NAME = "E2E Apples Edited";
export const E2E_MANUAL_ITEM_QUANTITY = "2 bags";

export const E2E_HOUSEHOLD: Household = {
  id: E2E_HOUSEHOLD_ID,
  name: "E2E Test Kitchen",
  invite_code: "E2E059",
  role: "owner",
};

export const E2E_MEMBER: Member = {
  household_id: E2E_HOUSEHOLD_ID,
  user_id: E2E_USER_ID,
  role: "owner",
  display_name: "E2E Tester",
  username: "e2e-tester",
  email: E2E_EMAIL,
  created_at: "2026-01-01T00:00:00.000Z",
  joined_at: "2026-01-01T00:00:00.000Z",
  last_active_at: "2026-01-01T00:00:00.000Z",
};

export const E2E_SESSION = {
  access_token: "e2e-access-token",
  refresh_token: "e2e-refresh-token",
  expires_in: 3600,
  expires_at: 4102444800,
  token_type: "bearer",
  user: {
    id: E2E_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: E2E_EMAIL,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {
      username: "e2e-tester",
      display_name: "E2E Tester",
    },
    identities: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  },
} as Session;

export const E2E_PRODUCT_SCAN_ITEMS: ScannedItem[] = [
  {
    id: "e2e-product-scan",
    name: "E2E Greek Yogurt",
    category: "Dairy",
    quantity: 1,
    unit: "tub",
    expiry_date: "2026-10-10",
    confidence: 0.98,
    storageZone: "fridge",
  },
];

export const E2E_BARCODE_SCAN_ITEMS: ScannedItem[] = [
  {
    id: "e2e-barcode-fallback",
    name: "Item (012345678905)",
    category: "Pantry",
    quantity: 1,
    unit: "units",
    expiry_date: null,
    confidence: 1,
    storageZone: "pantry",
  },
];
