const backendUrl = (process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

export type ShoppingRow = { id: string; household_id: string; food_id?: string | null; name: string; quantity: string; unit: string; checked: boolean; created_at: string; updated_at: string };

async function shoppingRequest<T>(token: string, household: string, method = 'GET', id?: string, body?: object): Promise<T> {
  if (!backendUrl) throw new Error('The backend connection is not configured.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${backendUrl}/api/v1/shopping${id ? `/${encodeURIComponent(id)}` : ''}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'X-Household-ID': household, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined, signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Please sign in again.');
      if (response.status === 403) throw new Error('You no longer have access to this household.');
      if (response.status === 404) throw new Error('Not found.');
      throw new Error('Could not complete shopping request.');
    }
    if (response.status === 204) return undefined as unknown as T;
    return await response.json();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('The shopping request timed out.');
    throw err;
  } finally { clearTimeout(timeout); }
}

export async function listShopping(token: string, household: string): Promise<ShoppingRow[]> {
  return shoppingRequest<ShoppingRow[]>(token, household, 'GET');
}

export async function addShoppingItem(token: string, household: string, item: { name: string; quantity?: number | string; unit?: string; food_id?: string | null }): Promise<ShoppingRow> {
  return shoppingRequest<ShoppingRow>(token, household, 'POST', undefined, item);
}

export async function updateShoppingItem(token: string, household: string, id: string, patch: { checked?: boolean; quantity?: number | string; unit?: string }): Promise<ShoppingRow> {
  return shoppingRequest<ShoppingRow>(token, household, 'PATCH', id, patch);
}

export async function clearCheckedShopping(token: string, household: string): Promise<{ deleted_count: number }> {
  if (!backendUrl) throw new Error('The backend connection is not configured.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${backendUrl}/api/v1/shopping/clear-checked`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'X-Household-ID': household }, signal: controller.signal,
    });
    if (!response.ok) throw new Error('Could not clear purchased items.');
    return await response.json();
  } finally { clearTimeout(timeout); }
}

export default { listShopping, addShoppingItem, updateShoppingItem, clearCheckedShopping };
