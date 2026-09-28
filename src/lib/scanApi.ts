import { StorageZone } from '../types';

export type ScanMode = 'food' | 'receipt' | 'tag';

export interface ScannedItem {
  id?: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  confidence?: number;
  storageZone?: StorageZone;
}

export interface UploadScanParams {
  token: string;
  householdId: string;
  mode: ScanMode;
  imageUri: string;
  fetchFn?: typeof fetch;
}

export const KNOWN_FOODS: Record<number, { name: string; category: string; storageZone: StorageZone }> = {
  1: { name: 'Apple', category: 'Produce', storageZone: 'fridge' },
  2: { name: 'Banana', category: 'Produce', storageZone: 'pantry' },
  3: { name: 'Orange', category: 'Produce', storageZone: 'fridge' },
  4: { name: 'Lemon', category: 'Produce', storageZone: 'fridge' },
  5: { name: 'Chicken', category: 'Meat', storageZone: 'fridge' },
  6: { name: 'Chicken Breast', category: 'Meat', storageZone: 'fridge' },
  7: { name: 'Chicken Rib', category: 'Meat', storageZone: 'fridge' },
  8: { name: 'Beef', category: 'Meat', storageZone: 'fridge' },
  9: { name: 'Fish', category: 'Meat', storageZone: 'fridge' },
  10: { name: 'Milk', category: 'Dairy', storageZone: 'fridge' },
  11: { name: 'Cheese', category: 'Dairy', storageZone: 'fridge' },
  12: { name: 'Yogurt', category: 'Dairy', storageZone: 'fridge' },
  13: { name: 'Egg', category: 'Dairy', storageZone: 'fridge' },
  14: { name: 'Bread', category: 'Bakery', storageZone: 'pantry' },
  15: { name: 'Carrot', category: 'Produce', storageZone: 'fridge' },
  16: { name: 'Tomato', category: 'Produce', storageZone: 'fridge' },
  17: { name: 'Core Power Protein', category: 'Beverage', storageZone: 'fridge' },
  18: { name: 'Park Salt', category: 'Pantry', storageZone: 'pantry' },
  19: { name: 'Fig', category: 'Produce', storageZone: 'fridge' },
  20: { name: 'Pomegranate', category: 'Produce', storageZone: 'fridge' },
};

export function getBackendUrl(): string {
  return (process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
}

export function formatExpiryDate(rawDate?: string | null): string | null {
  if (!rawDate) return null;
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return rawDate.slice(0, 10);
    return d.toISOString().split('T')[0];
  } catch {
    return rawDate.slice(0, 10);
  }
}

export function normalizeScanResponse(data: unknown): ScannedItem[] {
  if (!data) return [];

  // If response is an array of inventory items (e.g. List[InventoryItemOut])
  if (Array.isArray(data)) {
    return data.map((item, index) => {
      const foodId = typeof item?.food_id === 'number' ? item.food_id : undefined;
      const known = foodId && KNOWN_FOODS[foodId] ? KNOWN_FOODS[foodId] : null;
      const rawName = item?.name || item?.food_name || known?.name || `Item ${index + 1}`;
      const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const category = item?.category || known?.category || 'Pantry';
      const storageZone = (item?.storage_zone || known?.storageZone || 'pantry') as StorageZone;
      const expiry_date = formatExpiryDate(item?.expiry_date);
      const quantity = typeof item?.quantity === 'number' ? item.quantity : 1;
      const unit = item?.unit || 'units';
      const confidence = typeof item?.confidence === 'number' ? item.confidence : undefined;

      return {
        id: item?.id ? String(item.id) : undefined,
        name,
        category,
        quantity,
        unit,
        expiry_date,
        confidence,
        storageZone,
      };
    });
  }

  // If response is a detection object with items
  if (typeof data === 'object') {
    const obj = data as Record<string, any>;
    const itemsList: any[] = Array.isArray(obj.items)
      ? obj.items
      : Array.isArray(obj.stored_items)
      ? obj.stored_items
      : [];

    const defaultConfidence = typeof obj.confidence === 'number' ? obj.confidence : undefined;

    return itemsList.map((item, index) => {
      if (typeof item === 'string') {
        const name = item.charAt(0).toUpperCase() + item.slice(1);
        return {
          name,
          category: 'Pantry',
          quantity: 1,
          unit: 'units',
          expiry_date: null,
          confidence: defaultConfidence,
          storageZone: 'pantry',
        };
      }

      const foodId = typeof item?.food_id === 'number' ? item.food_id : undefined;
      const known = foodId && KNOWN_FOODS[foodId] ? KNOWN_FOODS[foodId] : null;
      const rawName = item?.name || known?.name || `Item ${index + 1}`;
      const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const category = item?.category || known?.category || 'Pantry';
      const storageZone = (item?.storage_zone || known?.storageZone || 'pantry') as StorageZone;
      const expiry_date = formatExpiryDate(item?.expiry_date);
      const confidence = typeof item?.confidence === 'number' ? item.confidence : defaultConfidence;

      return {
        id: item?.id ? String(item.id) : undefined,
        name,
        category,
        quantity: typeof item?.quantity === 'number' ? item.quantity : 1,
        unit: item?.unit || 'units',
        expiry_date,
        confidence,
        storageZone,
      };
    });
  }

  return [];
}

export async function uploadScanImage({
  token,
  householdId,
  mode,
  imageUri,
  fetchFn = fetch,
}: UploadScanParams): Promise<ScannedItem[]> {
  const backendUrl = getBackendUrl();
  if (!backendUrl) {
    throw new Error('The backend connection is not configured.');
  }
  if (!token) {
    throw new Error('Please sign in again.');
  }
  if (!householdId) {
    throw new Error('Choose a household first.');
  }

  const formData = new FormData();
  formData.append('mode', mode);

  // Handle image attachment for React Native and Web environments
  if (imageUri.startsWith('data:') || imageUri.startsWith('blob:')) {
    // If it's a blob/data URI (e.g. web), fetch the blob and append
    try {
      const res = await fetchFn(imageUri);
      const blob = await res.blob();
      formData.append('file', blob, 'scan.jpg');
    } catch {
      formData.append('file', {
        uri: imageUri,
        name: 'scan.jpg',
        type: 'image/jpeg',
      } as any);
    }
  } else {
    // React Native mobile local file URI
    formData.append('file', {
      uri: imageUri,
      name: 'scan.jpg',
      type: 'image/jpeg',
    } as any);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const response = await fetchFn(`${backendUrl}/api/v1/scan/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Household-ID': householdId,
        // Do NOT set 'Content-Type': multipart/form-data boundary is set automatically
      },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Please sign in again.');
      }
      if (response.status === 403) {
        throw new Error('You no longer have access to this household.');
      }
      if (response.status === 413) {
        throw new Error('The captured image is too large (max 8MB). Please try again.');
      }
      if (response.status === 415) {
        throw new Error('Unsupported image type. Please capture JPEG or PNG.');
      }
      if (response.status === 422) {
        const problem = await response.json().catch(() => null);
        const detail = problem?.detail;
        if (typeof detail === 'string') {
          if (detail.toLowerCase().includes('no food items detected') || detail.toLowerCase().includes('no food')) {
            throw new Error('No food items detected. Please adjust lighting and try again.');
          }
          if (detail.toLowerCase().includes('does not match') || detail.toLowerCase().includes('mismatch')) {
            throw new Error(`The image content does not match the selected '${mode}' mode. Try switching mode.`);
          }
          throw new Error(detail);
        }
        throw new Error('No food detected. Please adjust camera framing and retry.');
      }

      const problem = await response.json().catch(() => null);
      throw new Error(problem?.detail || 'Scan processing failed. Please try again.');
    }

    const data = await response.json();
    const items = normalizeScanResponse(data);
    if (items.length === 0) {
      throw new Error('No food items detected. Please adjust lighting and try again.');
    }
    return items;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Scan request timed out. Please check your network and retry.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
