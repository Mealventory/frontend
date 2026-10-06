import type { FoodItem, StorageZone } from '../types';
const backendUrl = (process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
export type InventoryRow = {
  id: string;
  household_id: string;
  name: string;
  category: string | null;
  quantity: number | string;
  remaining_percent?: number | string | null;
  is_low_stock?: boolean;
  unit: string;
  expiry_date: string | null;
  status: string;
  storage_zone?: StorageZone | null;
  image_ref?: string | null;
};
export type NewItem = {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  storage_zone?: StorageZone;
  image_ref?: string | null;
};

export async function inventoryRequest<T>(token: string, household: string, method = 'GET', id?: string, body?: Partial<NewItem>, action?: 'consume' | 'discard'): Promise<T> {
  if (!backendUrl) throw new Error('The backend connection is not configured.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${backendUrl}/api/v1/items${id ? `/${encodeURIComponent(id)}` : ''}${action ? `/${action}` : ''}`, {
      method, headers: { Authorization: `Bearer ${token}`, 'X-Household-ID': household, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined, signal: controller.signal,
    });
    // Deleting an already-removed item is safe when another phone deleted first.
    if (method === 'DELETE' && response.status === 404) {
      const problem = await response.json().catch(() => null);
      if (problem?.detail === 'Item not found in this household') return undefined as T;
    }
    if (!response.ok) {
      if (action && response.status === 400) throw new Error('This item is no longer active. Refresh your kitchen.');
      if (response.status === 401) throw new Error('Please sign in again.');
      if (response.status === 403) throw new Error('You no longer have access to this household.');
      if (response.status === 404) throw new Error('The backend needs the household inventory update.');
      throw new Error('Could not update or load inventory. Please try again.');
    }
    if (response.status === 204) return undefined as T;
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Inventory request timed out. Please retry.');
    throw error;
  } finally { clearTimeout(timeout); }
}

export async function batchCreateInventoryItems<T = InventoryRow[]>(
  token: string,
  household: string,
  items: NewItem[],
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  if (!backendUrl) throw new Error('The backend connection is not configured.');
  if (!household) throw new Error('Choose a household first.');
  if (!items || items.length === 0) return [] as unknown as T;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    let response = await fetchFn(`${backendUrl}/api/v1/inventory/batch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Household-ID': household,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(items),
      signal: controller.signal,
    });

    if (response.status === 404) {
      response = await fetchFn(`${backendUrl}/api/v1/items/batch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Household-ID': household,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(items),
        signal: controller.signal,
      });
    }

    if (!response.ok) {
      if (response.status === 401) throw new Error('Please sign in again.');
      if (response.status === 403) throw new Error('You no longer have access to this household.');
      const problem = await response.json().catch(() => null);
      throw new Error(problem?.detail || 'Could not batch save items to inventory. Please try again.');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Inventory batch request timed out. Please retry.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function toFoodItem(row: InventoryRow): FoodItem {
  const expiry = row.expiry_date ? new Date(`${row.expiry_date}T00:00:00`) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return { id: row.id, name: row.name, category: row.category || 'Pantry',
    quantity: `${Number(row.quantity)} ${row.unit}`,
    remainingPercent: row.remaining_percent == null ? null : Number(row.remaining_percent),
    isLowStock: Boolean(row.is_low_stock),
    emoji: '🍽️',
    expiryDate: row.expiry_date, storageZone: row.storage_zone || undefined, imageRef: row.image_ref ?? null,
    expDate: expiry ? expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not set',
    daysLeft: expiry ? Math.round((expiry.getTime() - today.getTime()) / 86400000) : 36500 };
}
