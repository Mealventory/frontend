const base = (
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  ""
).replace(/\/$/, "");

export interface ShoppingItem {
  id: string;
  household_id: string;
  food_id: string | null;
  name: string;
  quantity: number | string;
  unit: string;
  checked: boolean;
  created_at: string;
  updated_at: string;
}

function headers(token: string, householdId: string, json = false) {
  return {
    Authorization: `Bearer ${token}`,
    "X-Household-ID": householdId,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function shoppingRequest<T>(
  token: string,
  householdId: string,
  path = "",
  init: RequestInit = {}
): Promise<T> {
  if (!base) throw new Error("The backend connection is not configured.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${base}/api/v1/shopping${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...headers(token, householdId, Boolean(init.body)),
        ...(init.headers || {}),
      },
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error("Please sign in again.");
      if (response.status === 403) throw new Error("You no longer have access to this household.");
      if (response.status === 404) throw new Error("Shopping item not found.");
      throw new Error("Could not update the shopping list. Please try again.");
    }
    if (response.status === 204) return undefined as T;
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("The shopping request timed out. Refresh the list before trying again; your change may have been saved.");
    }
    if (error instanceof TypeError) {
      throw new Error("Could not reach the shopping service. Check your connection and refresh the list before trying again.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function listShoppingItems(token: string, householdId: string) {
  return shoppingRequest<ShoppingItem[]>(token, householdId);
}

export function addShoppingItem(
  token: string,
  householdId: string,
  name: string,
  quantity = 1,
  unit = "units"
) {
  return shoppingRequest<ShoppingItem>(token, householdId, "", {
    method: "POST",
    body: JSON.stringify({ name: name.trim(), quantity, unit }),
  });
}

export function updateShoppingItem(
  token: string,
  householdId: string,
  itemId: string,
  patch: { checked?: boolean; quantity?: number; unit?: string }
) {
  return shoppingRequest<ShoppingItem>(token, householdId, `/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteShoppingItem(
  token: string,
  householdId: string,
  itemId: string
) {
  return shoppingRequest<void>(token, householdId, `/${itemId}`, {
    method: "DELETE",
  });
}

export function clearCheckedShoppingItems(token: string, householdId: string) {
  return shoppingRequest<{ deleted_count: number }>(
    token,
    householdId,
    "/clear-checked",
    { method: "POST" }
  );
}

export async function addMissingIngredientsToShopping(
  token: string,
  householdId: string,
  ingredients: string[]
): Promise<{ added: number; skipped: number }> {
  // Keep the first spelling while comparing names without case or edge spaces.
  const names = new Map<string, string>();
  for (const ingredient of ingredients) {
    const name = ingredient.trim();
    const key = name.toLocaleLowerCase();
    if (name && !names.has(key)) names.set(key, name);
  }
  const unique = [...names.values()];
  if (unique.length === 0) return { added: 0, skipped: 0 };

  const existing = await listShoppingItems(token, householdId);
  const existingNames = new Set(
    existing.map((item) => item.name.trim().toLocaleLowerCase())
  );
  let added = 0;
  let skipped = 0;

  for (const name of unique) {
    if (existingNames.has(name.toLocaleLowerCase())) {
      skipped += 1;
      continue;
    }
    await addShoppingItem(token, householdId, name);
    existingNames.add(name.toLocaleLowerCase());
    added += 1;
  }

  return { added, skipped };
}
