import { resolveScanZone } from './storageZones';
import { getBackendUrl, ScannedItem } from './scanApi';
import { StorageZone } from '../types';

export function normalizeOpenFoodFactsCategory(categoriesTags?: string[], categoryStr?: string): { category: string; storageZone: StorageZone } {
  const combined = [
    ...(Array.isArray(categoriesTags) ? categoriesTags : []),
    categoryStr || '',
  ].join(' ').toLowerCase();

  if (combined.includes('frozen') || combined.includes('ice cream')) return { category: 'Frozen', storageZone: 'freezer' };
  if (combined.includes('dairy') || combined.includes('milk') || combined.includes('cheese') || combined.includes('yogurt') || combined.includes('butter')) return { category: 'Dairy', storageZone: 'fridge' };
  if (combined.includes('meat') || combined.includes('poultry') || combined.includes('beef') || combined.includes('chicken') || combined.includes('pork') || combined.includes('fish') || combined.includes('seafood')) return { category: 'Meat', storageZone: 'fridge' };
  if (combined.includes('beverage') || combined.includes('drink') || combined.includes('juice') || combined.includes('soda') || combined.includes('tea') || combined.includes('coffee')) return { category: 'Beverage', storageZone: 'fridge' };
  if (combined.includes('fruit') || combined.includes('vegetable') || combined.includes('produce') || combined.includes('salad') || combined.includes('fresh')) return { category: 'Produce', storageZone: 'fridge' };
  if (combined.includes('bread') || combined.includes('bakery') || combined.includes('pastry') || combined.includes('toast') || combined.includes('bagel')) return { category: 'Bakery', storageZone: 'pantry' };
  if (combined.includes('spice') || combined.includes('herb') || combined.includes('seasoning')) return { category: 'Spices', storageZone: 'spicerack' };
  return { category: 'Pantry', storageZone: 'pantry' };
}

function fallbackItem(barcode: string): ScannedItem {
  const cleanBarcode = (barcode || '').trim();
  return {
    name: cleanBarcode ? `Item (${cleanBarcode})` : 'Unknown Barcode Item',
    category: 'Pantry',
    quantity: 1,
    unit: 'units',
    expiry_date: null,
    confidence: cleanBarcode ? 0.8 : 0.5,
    storageZone: 'pantry',
  };
}

export async function fetchProductByBarcode(
  barcode: string,
  token: string,
  fetchFn: typeof fetch = fetch
): Promise<ScannedItem> {
  const cleanBarcode = (barcode || '').trim();
  if (!cleanBarcode || !token) return fallbackItem(cleanBarcode);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);
  try {
    const backendUrl = getBackendUrl();
    if (!backendUrl) return fallbackItem(cleanBarcode);
    const response = await fetchFn(
      `${backendUrl}/api/v1/barcode/${encodeURIComponent(cleanBarcode)}`,
      { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }
    );
    if (!response.ok) return fallbackItem(cleanBarcode);
    const product = await response.json();
    if (!product?.found) return fallbackItem(cleanBarcode);

    const category = typeof product.category === 'string' ? product.category : 'Pantry';
    const storageZone = typeof product.storage_zone === 'string'
      ? product.storage_zone as StorageZone
      : normalizeOpenFoodFactsCategory([], category).storageZone;
    const days = product.shelf_life_days ?? product.shelf_life?.days;
    return {
      name: typeof product.name === 'string' ? product.name : `Item (${cleanBarcode})`,
      brand: typeof product.brand === 'string' ? product.brand : undefined,
      category,
      quantity: 1,
      unit: 'units',
      expiry_date: null,
      confidence: 0.95,
      storageZone: resolveScanZone(storageZone, category),
      imageRef: typeof product.image_url === 'string' ? product.image_url : undefined,
      shelfLifeDays: Number.isFinite(days) ? days : undefined,
    };
  } catch {
    return fallbackItem(cleanBarcode);
  } finally {
    clearTimeout(timeoutId);
  }
}
