import type { FoodItem, StorageZone } from '../types';

export const STORAGE_LOCATION_QR_VERSION = 1;
export const STORAGE_LOCATION_QR_PREFIX = 'mealventory://storage-location';

export const VALID_STORAGE_ZONES: readonly StorageZone[] = [
  'pantry',
  'fridge',
  'freezer',
  'spicerack',
];

const ZONE_LABELS: Record<StorageZone, string> = {
  pantry: 'Pantry',
  fridge: 'Refrigerator',
  freezer: 'Freezer',
  spicerack: 'Spice Rack',
};

export interface StorageSubLocation {
  id: string;
  householdId: string;
  zone: StorageZone;
  name: string;
  instructions?: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StorageLocationStore {
  locations: StorageSubLocation[];
  assignments: Record<string, string>;
}

export interface StringStorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export type ParsedStorageLocationQr =
  | {
      ok: true;
      version: 1;
      householdId: string;
      locationId: string;
    }
  | {
      ok: false;
      reason: 'invalid_payload' | 'unsupported_version';
      message: string;
    };

export type ResolvedStorageLocation =
  | {
      ok: true;
      location: StorageSubLocation;
    }
  | {
      ok: false;
      reason: 'unauthenticated' | 'invalid_payload' | 'unsupported_version' | 'wrong_household' | 'not_found';
      message: string;
    };

export function isValidStorageZone(value: unknown): value is StorageZone {
  return typeof value === 'string' && (VALID_STORAGE_ZONES as readonly string[]).includes(value);
}

export function storageLocationZoneLabel(zone: StorageZone): string {
  return ZONE_LABELS[zone];
}

function normalizeOpaqueId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed) || trimmed.length > 128) {
    throw new Error('Invalid storage location identifier.');
  }
  return trimmed;
}

export function buildStorageLocationQrPayload(householdId: string, locationId: string): string {
  const safeHousehold = normalizeOpaqueId(householdId);
  const safeLocation = normalizeOpaqueId(locationId);
  return `${STORAGE_LOCATION_QR_PREFIX}?v=${STORAGE_LOCATION_QR_VERSION}&h=${encodeURIComponent(safeHousehold)}&l=${encodeURIComponent(safeLocation)}`;
}

export function isStorageLocationQrPayload(raw: string): boolean {
  const trimmed = raw.trim();
  return (
    trimmed === STORAGE_LOCATION_QR_PREFIX ||
    trimmed.startsWith(`${STORAGE_LOCATION_QR_PREFIX}?`)
  );
}

export function parseStorageLocationQrPayload(raw: string): ParsedStorageLocationQr {
  const trimmed = raw.trim();
  if (!isStorageLocationQrPayload(trimmed)) {
    return {
      ok: false,
      reason: 'invalid_payload',
      message: 'This QR code is not a Mealventory storage label.',
    };
  }

  const queryIndex = trimmed.indexOf('?');
  if (queryIndex === -1) {
    return {
      ok: false,
      reason: 'invalid_payload',
      message: 'Storage label QR code is missing required location details.',
    };
  }

  const params = new URLSearchParams(trimmed.slice(queryIndex + 1));
  const versionRaw = params.get('v');
  if (!versionRaw || !/^\d+$/.test(versionRaw)) {
    return {
      ok: false,
      reason: 'invalid_payload',
      message: 'Storage label QR code is missing a valid version.',
    };
  }

  const version = Number(versionRaw);
  if (version !== STORAGE_LOCATION_QR_VERSION) {
    return {
      ok: false,
      reason: 'unsupported_version',
      message: `Storage label QR version ${version} is not supported by this version of Mealventory.`,
    };
  }

  const householdId = (params.get('h') ?? '').trim();
  const locationId = (params.get('l') ?? '').trim();
  if (!householdId || !locationId || /\s/.test(householdId) || /\s/.test(locationId)) {
    return {
      ok: false,
      reason: 'invalid_payload',
      message: 'Storage label QR code is incomplete or malformed.',
    };
  }

  return {
    ok: true,
    version: 1,
    householdId,
    locationId,
  };
}

export function resolveScannedStorageLocation({
  rawPayload,
  authenticated,
  activeHouseholdId,
  locations,
}: {
  rawPayload: string;
  authenticated: boolean;
  activeHouseholdId: string | null | undefined;
  locations: readonly StorageSubLocation[];
}): ResolvedStorageLocation {
  if (!authenticated || !activeHouseholdId) {
    return {
      ok: false,
      reason: 'unauthenticated',
      message: 'Sign in and select a household before opening a storage label.',
    };
  }

  const parsed = parseStorageLocationQrPayload(rawPayload);
  if (!parsed.ok) {
    return parsed;
  }

  if (parsed.householdId !== activeHouseholdId) {
    return {
      ok: false,
      reason: 'wrong_household',
      message: 'This storage label belongs to a different household or has been revoked.',
    };
  }

  const match = locations.find(
    (loc) => loc.id === parsed.locationId && loc.householdId === activeHouseholdId
  );
  if (!match) {
    return {
      ok: false,
      reason: 'not_found',
      message: 'This storage bin or shelf no longer exists in your household.',
    };
  }

  return {
    ok: true,
    location: match,
  };
}

export function storageLocationShareText(
  location: StorageSubLocation,
  householdName?: string
): string {
  const payload = buildStorageLocationQrPayload(location.householdId, location.id);
  const zoneLabel = storageLocationZoneLabel(location.zone);
  const lines = [
    householdName?.trim()
      ? `${householdName.trim()} — ${zoneLabel} → ${location.name}`
      : `${zoneLabel} → ${location.name}`,
  ];
  if (location.instructions?.trim()) {
    lines.push(`Note: ${location.instructions.trim()}`);
  }
  lines.push(`Scan in Mealventory: ${payload}`);
  return lines.join('\n');
}

export function emptyStorageLocationStore(): StorageLocationStore {
  return { locations: [], assignments: {} };
}

function createOpaqueLocationId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `loc_${Date.now().toString(36)}_${random}`;
}

export function createSubLocation(
  store: StorageLocationStore,
  input: {
    id?: string;
    householdId: string;
    zone: StorageZone;
    name: string;
    instructions?: string;
    now?: string;
  }
): { store: StorageLocationStore; location: StorageSubLocation } {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Enter a name for this shelf or bin.');
  }
  if (!isValidStorageZone(input.zone)) {
    throw new Error('Choose a valid storage zone.');
  }
  const householdId = normalizeOpaqueId(input.householdId);
  const timestamp = input.now ?? new Date().toISOString();
  const instructions = input.instructions?.trim() || undefined;
  const location: StorageSubLocation = {
    id: input.id ? normalizeOpaqueId(input.id) : createOpaqueLocationId(),
    householdId,
    zone: input.zone,
    name,
    ...(instructions ? { instructions } : {}),
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return {
    location,
    store: {
      locations: [...store.locations, location],
      assignments: { ...store.assignments },
    },
  };
}

export function renameSubLocation(
  store: StorageLocationStore,
  locationId: string,
  updates: { name: string; instructions?: string; now?: string }
): StorageLocationStore {
  const trimmedName = updates.name.trim();
  if (!trimmedName) {
    throw new Error('Storage location name cannot be empty.');
  }
  const idx = store.locations.findIndex((loc) => loc.id === locationId);
  if (idx === -1) {
    throw new Error('Storage location not found.');
  }
  const timestamp = updates.now ?? new Date().toISOString();
  const instructions =
    updates.instructions !== undefined
      ? updates.instructions.trim() || undefined
      : store.locations[idx].instructions;

  const updated: StorageSubLocation = {
    ...store.locations[idx],
    name: trimmedName,
    updatedAt: timestamp,
  };
  if (instructions) {
    updated.instructions = instructions;
  } else {
    delete updated.instructions;
  }

  const nextLocations = store.locations.slice();
  nextLocations[idx] = updated;
  return {
    locations: nextLocations,
    assignments: { ...store.assignments },
  };
}

export function setSubLocationArchived(
  store: StorageLocationStore,
  locationId: string,
  archived: boolean,
  now = new Date().toISOString()
): StorageLocationStore {
  const idx = store.locations.findIndex((loc) => loc.id === locationId);
  if (idx === -1) {
    throw new Error('Storage location not found.');
  }
  const nextLocations = store.locations.slice();
  nextLocations[idx] = {
    ...store.locations[idx],
    archived,
    updatedAt: now,
  };
  return {
    locations: nextLocations,
    assignments: { ...store.assignments },
  };
}

export function assignItemToSubLocation(
  store: StorageLocationStore,
  itemId: string,
  locationId: string | null
): StorageLocationStore {
  const nextAssignments = { ...store.assignments };
  if (locationId === null) {
    delete nextAssignments[itemId];
    return { locations: store.locations.slice(), assignments: nextAssignments };
  }
  const target = store.locations.find((loc) => loc.id === locationId);
  if (!target) {
    throw new Error('Target storage location not found.');
  }
  if (target.archived) {
    throw new Error('Cannot move items into an archived storage location.');
  }
  nextAssignments[itemId] = locationId;
  return { locations: store.locations.slice(), assignments: nextAssignments };
}

export function deleteSubLocationSafely(
  store: StorageLocationStore,
  locationId: string,
  targetLocationId?: string | null
): {
  store: StorageLocationStore;
  movedItemIds: string[];
  unassignedItemIds: string[];
} {
  const existing = store.locations.find((loc) => loc.id === locationId);
  if (!existing) {
    throw new Error('Storage location not found.');
  }

  let validTarget: StorageSubLocation | undefined;
  if (targetLocationId) {
    if (targetLocationId === locationId) {
      throw new Error('Choose a different destination bin or shelf.');
    }
    validTarget = store.locations.find(
      (loc) =>
        loc.id === targetLocationId &&
        loc.householdId === existing.householdId &&
        !loc.archived
    );
    if (!validTarget) {
      throw new Error('Destination storage location is unavailable.');
    }
  }

  const nextAssignments = { ...store.assignments };
  const movedItemIds: string[] = [];
  const unassignedItemIds: string[] = [];

  for (const [itemId, assignedId] of Object.entries(nextAssignments)) {
    if (assignedId !== locationId) continue;
    if (validTarget) {
      nextAssignments[itemId] = validTarget.id;
      movedItemIds.push(itemId);
    } else {
      delete nextAssignments[itemId];
      unassignedItemIds.push(itemId);
    }
  }

  return {
    store: {
      locations: store.locations.filter((loc) => loc.id !== locationId),
      assignments: nextAssignments,
    },
    movedItemIds,
    unassignedItemIds,
  };
}

export function filterItemsBySubLocation(
  items: readonly FoodItem[],
  store: StorageLocationStore,
  locationId: string
): FoodItem[] {
  return items.filter((item) => store.assignments[item.id] === locationId);
}

export function storageLocationStorageKey(householdId: string): string {
  return `mealventory.storageLocations.v1.${householdId}`;
}

function defaultStorage(): StringStorageLike | null {
  try {
    // Lazy require avoids loading expo-constants in plain Node unit tests.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./storage') as { appStorage?: StringStorageLike };
    return mod.appStorage ?? null;
  } catch {
    return null;
  }
}

export function loadStorageLocationStore(
  householdId: string,
  storage: StringStorageLike | null = defaultStorage()
): StorageLocationStore {
  if (!householdId || !storage) return emptyStorageLocationStore();
  try {
    const raw = storage.getItem(storageLocationStorageKey(householdId));
    if (!raw) return emptyStorageLocationStore();
    const parsed = JSON.parse(raw) as Partial<StorageLocationStore> | null;
    if (!parsed || typeof parsed !== 'object') return emptyStorageLocationStore();
    const locations = Array.isArray(parsed.locations)
      ? parsed.locations.filter(
          (loc): loc is StorageSubLocation =>
            Boolean(loc) &&
            typeof loc.id === 'string' &&
            typeof loc.householdId === 'string' &&
            typeof loc.name === 'string' &&
            isValidStorageZone(loc.zone)
        )
      : [];
    const rawAssignments =
      parsed.assignments && typeof parsed.assignments === 'object'
        ? parsed.assignments
        : {};
    const validIds = new Set(locations.map((loc) => loc.id));
    const assignments: Record<string, string> = {};
    for (const [itemId, locId] of Object.entries(rawAssignments)) {
      if (typeof locId === 'string' && validIds.has(locId)) {
        assignments[itemId] = locId;
      }
    }
    return { locations, assignments };
  } catch {
    return emptyStorageLocationStore();
  }
}

export function saveStorageLocationStore(
  householdId: string,
  store: StorageLocationStore,
  storage: StringStorageLike | null = defaultStorage()
): void {
  if (!householdId || !storage) return;
  storage.setItem(storageLocationStorageKey(householdId), JSON.stringify(store));
}
