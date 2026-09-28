import { resolveScanZone } from './storageZones';
import { ScannedItem } from './scanApi';
import { StorageZone } from '../types';

export function normalizeOpenFoodFactsCategory(categoriesTags?: string[], categoryStr?: string): { category: string; storageZone: StorageZone } {
  const combined = [
    ...(Array.isArray(categoriesTags) ? categoriesTags : []),
    categoryStr || '',
  ].join(' ').toLowerCase();

  if (combined.includes('frozen') || combined.includes('ice cream')) {
    return { category: 'Frozen', storageZone: 'freezer' };
  }
  if (combined.includes('dairy') || combined.includes('milk') || combined.includes('cheese') || combined.includes('yogurt') || combined.includes('butter')) {
    return { category: 'Dairy', storageZone: 'fridge' };
  }
  if (combined.includes('meat') || combined.includes('poultry') || combined.includes('beef') || combined.includes('chicken') || combined.includes('pork') || combined.includes('fish') || combined.includes('seafood')) {
    return { category: 'Meat', storageZone: 'fridge' };
  }
  if (combined.includes('beverage') || combined.includes('drink') || combined.includes('juice') || combined.includes('soda') || combined.includes('tea') || combined.includes('coffee')) {
    return { category: 'Beverage', storageZone: 'fridge' };
  }
  if (combined.includes('fruit') || combined.includes('vegetable') || combined.includes('produce') || combined.includes('salad') || combined.includes('fresh')) {
    return { category: 'Produce', storageZone: 'fridge' };
  }
  if (combined.includes('bread') || combined.includes('bakery') || combined.includes('pastry') || combined.includes('toast') || combined.includes('bagel')) {
    return { category: 'Bakery', storageZone: 'pantry' };
  }
  if (combined.includes('spice') || combined.includes('herb') || combined.includes('seasoning')) {
    return { category: 'Spices', storageZone: 'spicerack' };
  }

  return { category: 'Pantry', storageZone: 'pantry' };
}

export async function fetchProductByBarcode(
  barcode: string,
  fetchFn: typeof fetch = fetch
): Promise<ScannedItem> {
  const cleanBarcode = (barcode || '').trim();
  if (!cleanBarcode) {
    return {
      name: 'Unknown Barcode Item',
      category: 'Pantry',
      quantity: 1,
      unit: 'units',
      expiry_date: null,
      confidence: 0.5,
      storageZone: 'pantry',
    };
  }

  const fallbackItem: ScannedItem = {
    name: `Item (${cleanBarcode})`,
    category: 'Pantry',
    quantity: 1,
    unit: 'units',
    expiry_date: null,
    confidence: 0.8,
    storageZone: 'pantry',
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`;
    const res = await fetchFn(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mealventory - iOS Scanner - Version 1.0',
      },
    });

    if (!res.ok) {
      return fallbackItem;
    }

    const data = await res.json();
    if (data?.status !== 1 || !data?.product) {
      return fallbackItem;
    }

    const product = data.product;
    const rawName = (product.product_name || product.product_name_en || product.generic_name || '').trim();
    const brand = (product.brands || '').trim();

    let name = rawName;
    if (brand && name && !name.toLowerCase().includes(brand.toLowerCase())) {
      name = `${brand} ${name}`;
    }
    if (!name) {
      name = brand ? `${brand} Product` : `Item (${cleanBarcode})`;
    }

    // Capitalize first letter
    name = name.charAt(0).toUpperCase() + name.slice(1);

    const { category, storageZone } = normalizeOpenFoodFactsCategory(
      product.categories_tags,
      product.categories
    );

    return {
      name,
      category,
      quantity: 1,
      unit: 'units',
      expiry_date: null,
      confidence: 0.95,
      storageZone: resolveScanZone(storageZone, category),
    };
  } catch {
    return fallbackItem;
  } finally {
    clearTimeout(timeoutId);
  }
}
