const base = (
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  ""
).replace(/\/$/, "");

export interface HouseholdStore {
  id: string;
  household_id: string;
  name: string;
  website_url: string | null;
  sort_order: number;
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

async function storeRequest<T>(
  token: string,
  householdId: string,
  path = "",
  init: RequestInit = {}
): Promise<T> {
  if (!base) throw new Error("The backend connection is not configured.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${base}/api/v1/stores${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...headers(token, householdId, Boolean(init.body)),
        ...(init.headers || {}),
      },
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error("Please sign in again.");
      if (response.status === 403) {
        throw new Error("You no longer have access to this household.");
      }
      if (response.status === 404) throw new Error("Store not found.");
      if (response.status === 409) {
        throw new Error("The store order changed. Refresh and try again.");
      }
      if (response.status === 422) {
        throw new Error("Check the store name and website URL.");
      }
      throw new Error("Could not update household stores. Please try again.");
    }
    if (response.status === 204) return undefined as T;
    return await response.json();
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        "The store request timed out. Refresh before trying again."
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        "Could not reach the store service. Check your connection and try again."
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function normalizeStoreUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function listHouseholdStores(token: string, householdId: string) {
  return storeRequest<HouseholdStore[]>(token, householdId);
}

export function addHouseholdStore(
  token: string,
  householdId: string,
  name: string,
  websiteUrl: string | null
) {
  return storeRequest<HouseholdStore>(token, householdId, "", {
    method: "POST",
    body: JSON.stringify({
      name: name.trim(),
      website_url: websiteUrl,
    }),
  });
}

export function updateHouseholdStore(
  token: string,
  householdId: string,
  storeId: string,
  patch: { name?: string; website_url?: string | null }
) {
  return storeRequest<HouseholdStore>(token, householdId, `/${storeId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteHouseholdStore(
  token: string,
  householdId: string,
  storeId: string
) {
  return storeRequest<void>(token, householdId, `/${storeId}`, {
    method: "DELETE",
  });
}

export function reorderHouseholdStores(
  token: string,
  householdId: string,
  storeIds: string[]
) {
  return storeRequest<HouseholdStore[]>(token, householdId, "/order", {
    method: "PUT",
    body: JSON.stringify({ store_ids: storeIds }),
  });
}
