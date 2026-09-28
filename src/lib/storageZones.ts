import type { StorageZone } from '../types';

// Suggestions only: the user can override these before saving a scanned item.
export function defaultScanZone(category: string): StorageZone {
  switch (category.trim().toLowerCase()) {
    case 'dairy':
    case 'meat':
    case 'seafood': return 'fridge';
    case 'frozen':
    case 'frozen foods': return 'freezer';
    case 'spices': return 'spicerack';
    default: return 'pantry';
  }
}
