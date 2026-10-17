import { resolveScanZone } from './storageZones';
import { StorageZone } from '../types';

export type ScanMode = 'food' | 'receipt' | 'tag';
export type ScannerMode = 'food' | 'receipt' | 'barcode' | 'tag';

export interface ScannedItem {
  id?: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiry_date: string | null;
  confidence?: number;
  storageZone?: StorageZone;
  imageRef?: string;
  brand?: string;
  shelfLifeDays?: number;
}

export interface UploadScanParams {
  token: string;
  householdId: string;
  mode: ScannerMode | ScanMode;
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

const CANADIAN_MONTHS: Record<string, string> = {
  ja: '01',
  fe: '02',
  mr: '03',
  al: '04',
  ma: '05',
  jn: '06',
  jl: '07',
  au: '08',
  se: '09',
  oc: '10',
  no: '11',
  de: '12',
};

const NAMED_MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04', jun: '06',
  jul: '07', aug: '08', sep: '09', sept: '09', oct: '10', nov: '11', dec: '12',
};

export function formatExpiryDate(rawDate?: string | null): string | null {
  if (!rawDate) return null;
  const str = String(rawDate).trim();
  if (!str) return null;

  // Canadian bilingual format: "2027 JA 25", "27 JA 25", "2027-JA-25", etc.
  const cleaned = str.replace(/[,.]/g, '').toLowerCase();
  const tokens = cleaned.split(/[\s\-_/]+/);
  if (tokens.length === 3) {
    if (tokens[1] in CANADIAN_MONTHS && /^\d+$/.test(tokens[0]) && /^\d+$/.test(tokens[2])) {
      const year = tokens[0].length === 2 ? `20${tokens[0]}` : tokens[0];
      const month = CANADIAN_MONTHS[tokens[1]];
      const day = tokens[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (tokens[0] in CANADIAN_MONTHS && /^\d+$/.test(tokens[1]) && /^\d+$/.test(tokens[2])) {
      const year = tokens[2].length === 2 ? `20${tokens[2]}` : tokens[2];
      const month = CANADIAN_MONTHS[tokens[0]];
      const day = tokens[1].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (tokens[0] in NAMED_MONTHS && /^\d+$/.test(tokens[1]) && /^\d+$/.test(tokens[2])) {
      const year = tokens[2].length === 2 ? `20${tokens[2]}` : tokens[2];
      const month = NAMED_MONTHS[tokens[0]];
      const day = tokens[1].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    if (tokens[1] in NAMED_MONTHS && /^\d+$/.test(tokens[0]) && /^\d+$/.test(tokens[2])) {
      const year = tokens[2].length === 2 ? `20${tokens[2]}` : tokens[2];
      const month = NAMED_MONTHS[tokens[1]];
      const day = tokens[0].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return str.slice(0, 10);
  } catch {
    return str.slice(0, 10);
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
      const storageZone = resolveScanZone(item?.storage_zone || item?.storageZone || known?.storageZone, category);
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
        imageRef: typeof item?.image_ref === 'string' ? item.image_ref : undefined,
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
    const topExpiry = Array.isArray(obj.expiry_dates) && obj.expiry_dates.length > 0
      ? formatExpiryDate(obj.expiry_dates[0])
      : formatExpiryDate(obj.expiry_date);

    if (itemsList.length === 0 && topExpiry) {
      return [
        {
          name: 'Tagged Item',
          category: 'Pantry',
          quantity: 1,
          unit: 'units',
          expiry_date: topExpiry,
          confidence: defaultConfidence,
          storageZone: 'pantry',
        },
      ];
    }

    return itemsList.map((item, index) => {
      if (typeof item === 'string') {
        const lower = item.toLowerCase();
        let name = item.charAt(0).toUpperCase() + item.slice(1);
        let category = 'Pantry';
        let storageZone: StorageZone = 'pantry';

        if (lower.includes('protein') || lower.includes('shake')) {
          name = 'Core Power Protein';
          category = 'Beverage';
          storageZone = 'fridge';
        } else if (lower.includes('milk') || lower.includes('lait') || lower.includes('cheese') || lower.includes('yogurt')) {
          category = 'Dairy';
          storageZone = 'fridge';
        }

        return {
          name,
          category,
          quantity: 1,
          unit: 'units',
          expiry_date: topExpiry,
          confidence: defaultConfidence,
          storageZone: resolveScanZone(storageZone, category),
        };
      }

      const foodId = typeof item?.food_id === 'number' ? item.food_id : undefined;
      const known = foodId && KNOWN_FOODS[foodId] ? KNOWN_FOODS[foodId] : null;
      const rawName = typeof item?.name === 'string' ? item.name : known?.name || `Item ${index + 1}`;
      const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
      const category = item?.category || known?.category || 'Pantry';
      const storageZone = resolveScanZone(item?.storage_zone || item?.storageZone || known?.storageZone, category);
      const expiry_date = formatExpiryDate(item?.expiry_date) || topExpiry;
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
        imageRef: typeof item?.image_ref === 'string' ? item.image_ref : undefined,
      };
    });
  }

  return [];
}

export function createUploadPart(bytes: Uint8Array, mimeType: string = 'image/jpeg'): any {
  // In Node.js or web browser environments, standard Blob constructor handles Uint8Array.
  // In React Native, BlobManager.createFromParts explicitly throws:
  // "Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported".
  try {
    const isRN = typeof navigator !== 'undefined' && (navigator as any).product === 'ReactNative';
    if (!isRN) {
      const blob: any = new Blob([bytes as any], { type: mimeType });
      blob.name = 'scan.jpg';
      blob.bytes = async () => bytes;
      return blob;
    }
  } catch {
    // Graceful fallback to Expo part
  }

  // React Native / Expo WinterCG fetch supports objects with .bytes() method natively
  const part: any = {
    name: 'scan.jpg',
    type: mimeType,
    size: bytes.length,
    bytes: async () => bytes,
    arrayBuffer: async () => bytes.buffer,
    slice: () => part,
  };
  return part;
}

export function dataUriToBlob(dataURI: string): any {
  const parts = dataURI.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = parts[1] || '';
  const binary = typeof atob === 'function'
    ? atob(base64Data)
    : typeof (globalThis as any).Buffer !== 'undefined'
    ? (globalThis as any).Buffer.from(base64Data, 'base64').toString('binary')
    : '';
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  return createUploadPart(array, mime);
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

  const apiMode = mode === 'barcode' ? 'food' : mode;
  const formData = new FormData();
  formData.append('mode', apiMode);

  // Safely attach file across Expo WinterCG fetch, React Native, Web, and Node.js
  if (imageUri.startsWith('data:')) {
    formData.append('file', dataUriToBlob(imageUri), 'scan.jpg');
  } else {
    let attached = false;
    // In React Native / Expo, fetch(fileUri) reads the local file into a Blob
    if (typeof fetchFn === 'function') {
      try {
        const fileRes = await fetchFn(imageUri);
        if (fileRes && typeof fileRes.blob === 'function') {
          const fileBlob: any = await fileRes.blob();
          if (fileBlob) {
            fileBlob.name = 'scan.jpg';
            if (typeof fileBlob.arrayBuffer === 'function') {
              const buffer = await fileBlob.arrayBuffer();
              const array = new Uint8Array(buffer);
              fileBlob.bytes = async () => array;
            }
            formData.append('file', fileBlob, 'scan.jpg');
            attached = true;
          }
        }
      } catch {
        // Fallback below
      }
    }

    if (!attached) {
      throw new Error('Could not read the photo. Please retake it or choose another image.');
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);
  const elementName = mode === 'receipt' ? 'Receipt' : mode === 'barcode' ? 'Barcode' : mode === 'tag' ? 'Tag' : 'Product';

  try {
    const response = await fetchFn(`${backendUrl}/api/v1/scan/preview`, {
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
            throw new Error(`${elementName} could not be detected. (No food items detected). Please adjust lighting and try again.`);
          }
          if (detail.toLowerCase().includes('does not match') || detail.toLowerCase().includes('mismatch')) {
            throw new Error(`The image content does not match the selected '${mode}' mode. Try switching mode.`);
          }
          throw new Error(detail);
        }
        throw new Error(`${elementName} could not be detected. Please adjust camera framing and retry.`);
      }

      const problem = await response.json().catch(() => null);
      throw new Error(typeof problem?.detail === 'string' ? problem.detail : problem?.detail?.message || 'Scanning service is unavailable. Check that AI services are running, then retry.');
    }

    const data = await response.json();
    const items = normalizeScanResponse(data);
    if (items.length === 0) {
      throw new Error(`${elementName} could not be detected. (No food items detected). Please adjust lighting and try again.`);
    }
    return items;
  } catch (error: any) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Scan request timed out. Please check your network and retry.');
    }
    const msg = (error?.message || '').toLowerCase();
    if (
      msg.includes('formdatapart') ||
      msg.includes('formatdatapart') ||
      msg.includes('arraybuffer') ||
      msg.includes('creating blobs') ||
      msg.includes('blob')
    ) {
      throw new Error('Could not upload the photo. Please retake it or choose another image.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
