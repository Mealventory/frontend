import { onlineManager } from '@tanstack/react-query';
import { appStorage } from './storage';
import { toFoodItem, type InventoryRow, type NewItem } from './inventoryApi';
import type { FoodItem } from '../types';

export type OfflineMutationKind = 'add' | 'update' | 'remove' | 'transition';

export type DiscardReason =
  | 'expired'
  | 'spoiled'
  | 'bought_too_much'
  | 'didnt_like'
  | 'other';

export type QueuedAddMutation = {
  id: string;
  kind: 'add';
  tempId: string;
  itemName: string;
  payload: NewItem;
  createdAt: number;
};

export type QueuedUpdateMutation = {
  id: string;
  kind: 'update';
  itemId: string;
  itemName: string;
  patch: Partial<NewItem>;
  createdAt: number;
};

export type QueuedRemoveMutation = {
  id: string;
  kind: 'remove';
  itemId: string;
  itemName: string;
  createdAt: number;
};

export type QueuedTransitionMutation = {
  id: string;
  kind: 'transition';
  itemId: string;
  itemName: string;
  action: 'consume' | 'discard';
  reason?: DiscardReason;
  createdAt: number;
};

export type QueuedInventoryMutation =
  | QueuedAddMutation
  | QueuedUpdateMutation
  | QueuedRemoveMutation
  | QueuedTransitionMutation;

export type SyncConflict = {
  id: string;
  mutation: QueuedInventoryMutation;
  itemName: string;
  message: string;
  failedAt: number;
};

export type ConnectivityState = {
  isConnected: boolean | null;
  isInternetReachable?: boolean | null;
};

export type ConnectivityAdapter = {
  fetch: () => Promise<boolean>;
  subscribe: (listener: (online: boolean) => void) => () => void;
};

type StringStorageLike = Pick<typeof appStorage, 'getItem' | 'setItem' | 'removeItem'>;

type NetInfoModuleLike = {
  fetch?: () => Promise<ConnectivityState>;
  addEventListener?: (listener: (state: ConnectivityState) => void) => () => void;
  default?: {
    fetch?: () => Promise<ConnectivityState>;
    addEventListener?: (listener: (state: ConnectivityState) => void) => () => void;
  };
};

declare const require: (name: '@react-native-community/netinfo') => NetInfoModuleLike;

export const OFFLINE_SYNC_TOAST_MESSAGE = 'Back online — Inventory synced successfully';

export function isOnlineFromNetInfo(state: ConnectivityState | null | undefined): boolean {
  if (!state) return true;
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

export function createNetInfoAdapter(): ConnectivityAdapter | null {
  try {
    const mod = require('@react-native-community/netinfo');
    const netInfo = mod?.default ?? mod;
    if (!netInfo || typeof netInfo.addEventListener !== 'function') {
      return null;
    }

    return {
      async fetch() {
        if (typeof netInfo.fetch !== 'function') return true;
        try {
          const state = await netInfo.fetch();
          return isOnlineFromNetInfo(state);
        } catch {
          return true;
        }
      },
      subscribe(listener) {
        const unsubscribe = netInfo.addEventListener?.((state) => {
          listener(isOnlineFromNetInfo(state));
        });
        return typeof unsubscribe === 'function' ? unsubscribe : () => {};
      },
    };
  } catch {
    return null;
  }
}

export function setupOnlineManager(adapter: ConnectivityAdapter | null = createNetInfoAdapter()): () => void {
  if (!adapter) {
    onlineManager.setOnline(true);
    return () => {};
  }

  let cleanup: (() => void) | undefined;
  onlineManager.setEventListener((setOnline) => {
    void adapter.fetch().then((online) => setOnline(online));
    const unsubscribe = adapter.subscribe((online) => {
      setOnline(online);
    });
    cleanup = unsubscribe;
    return unsubscribe;
  });

  return () => {
    cleanup?.();
  };
}

export function offlineQueueStorageKey(
  userId?: string | null,
  householdId?: string | null,
): string | null {
  if (!userId || !householdId) return null;
  return `mealventory:offline-queue:${userId}:${householdId}`;
}

export function offlineConflictsStorageKey(
  userId?: string | null,
  householdId?: string | null,
): string | null {
  if (!userId || !householdId) return null;
  return `mealventory:offline-conflicts:${userId}:${householdId}`;
}

export function loadOfflineQueue(
  key: string | null,
  storage: StringStorageLike = appStorage,
): QueuedInventoryMutation[] {
  if (!key) return [];
  const raw = storage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is QueuedInventoryMutation =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        typeof entry.id === 'string' &&
        typeof entry.kind === 'string' &&
        typeof entry.createdAt === 'number',
    );
  } catch {
    return [];
  }
}

export function saveOfflineQueue(
  key: string | null,
  queue: QueuedInventoryMutation[],
  storage: StringStorageLike = appStorage,
): void {
  if (!key) return;
  if (queue.length === 0) {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, JSON.stringify(queue));
}

export function loadSyncConflicts(
  key: string | null,
  storage: StringStorageLike = appStorage,
): SyncConflict[] {
  if (!key) return [];
  const raw = storage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is SyncConflict =>
        Boolean(entry) &&
        typeof entry === 'object' &&
        typeof entry.id === 'string' &&
        typeof entry.message === 'string' &&
        Boolean(entry.mutation),
    );
  } catch {
    return [];
  }
}

export function saveSyncConflicts(
  key: string | null,
  conflicts: SyncConflict[],
  storage: StringStorageLike = appStorage,
): void {
  if (!key) return;
  if (conflicts.length === 0) {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, JSON.stringify(conflicts));
}

export function createOfflineId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildFoodItemFromNewItem(id: string, payload: NewItem): FoodItem {
  const expiry = payload.expiry_date ? new Date(`${payload.expiry_date}T00:00:00`) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    id,
    name: payload.name,
    category: payload.category || 'Pantry',
    quantity: `${Number(payload.quantity)} ${payload.unit || 'units'}`,
    emoji: '🍽️',
    expiryDate: payload.expiry_date,
    storageZone: payload.storage_zone,
    imageRef: payload.image_ref ?? null,
    expDate: expiry
      ? expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Not set',
    daysLeft: expiry ? Math.round((expiry.getTime() - today.getTime()) / 86400000) : 36500,
  };
}

export function applyPatchToFoodItem(item: FoodItem, patch: Partial<NewItem>): FoodItem {
  const existingQuantity = item.quantity.trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  const quantityValue = patch.quantity ?? Number(existingQuantity?.[1] || 1);
  const quantityUnit = patch.unit ?? (existingQuantity?.[2] || 'units');
  const expiryDate = patch.expiry_date !== undefined ? patch.expiry_date : item.expiryDate;
  const expiry = expiryDate ? new Date(`${expiryDate}T00:00:00`) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return {
    ...item,
    name: patch.name ?? item.name,
    category: patch.category ?? item.category,
    quantity: `${quantityValue} ${quantityUnit}`,
    expiryDate,
    expDate: expiry
      ? expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Not set',
    daysLeft: expiry ? Math.round((expiry.getTime() - today.getTime()) / 86400000) : 36500,
    storageZone: patch.storage_zone ?? item.storageZone,
    imageRef: patch.image_ref !== undefined ? patch.image_ref : item.imageRef,
  };
}

export function isAuthOrAccessError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message === 'Please sign in again.' ||
    error.message === 'You no longer have access to this household.'
  );
}

export function isConnectivityError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (isAuthOrAccessError(error)) return false;

  if (
    error.message === 'This item is no longer active. Refresh your kitchen.' ||
    error.message === 'The backend needs the household inventory update.' ||
    error.message === 'Could not update or load inventory. Please try again.' ||
    error.message === 'The backend connection is not configured.' ||
    error.message === 'Choose a household first.'
  ) {
    return false;
  }

  if (error.name === 'TypeError' || error.name === 'AbortError') {
    return true;
  }

  return /network|offline|timed out|failed to fetch|connection|internet|socket|econn|enet|ehost/i.test(
    error.message,
  );
}

export function formatMutationConflictMessage(error: unknown): string {
  if (!(error instanceof Error) || !error.message) {
    return 'This item changed on another device before syncing.';
  }
  if (
    error.message === 'This item is no longer active. Refresh your kitchen.' ||
    error.message === 'The backend needs the household inventory update.'
  ) {
    return 'This item was modified or removed on another device.';
  }
  return error.message;
}

function rewriteEntryItemId(
  entry: QueuedInventoryMutation,
  resolvedTempIds: Map<string, string>,
): QueuedInventoryMutation {
  if (entry.kind === 'add') return entry;
  const mappedId = resolvedTempIds.get(entry.itemId);
  if (!mappedId) return entry;
  return { ...entry, itemId: mappedId };
}

export type FlushExecutor = {
  add: (payload: NewItem) => Promise<InventoryRow>;
  update: (id: string, patch: Partial<NewItem>) => Promise<InventoryRow>;
  remove: (id: string) => Promise<void>;
  transition: (
    id: string,
    action: 'consume' | 'discard',
    reason?: DiscardReason,
  ) => Promise<void>;
};

export type FlushCallbacks = {
  onAddResolved?: (tempId: string, item: FoodItem) => void;
  onUpdateResolved?: (itemId: string, item: FoodItem) => void;
  onRemoveResolved?: (itemId: string) => void;
};

export type FlushResult = {
  flushedCount: number;
  remainingQueue: QueuedInventoryMutation[];
  newConflicts: SyncConflict[];
  stoppedReason: 'completed' | 'offline' | 'auth';
  authErrorMessage?: string;
};

export async function flushOfflineMutations(
  queue: QueuedInventoryMutation[],
  executor: FlushExecutor,
  callbacks: FlushCallbacks = {},
): Promise<FlushResult> {
  if (queue.length === 0) {
    return {
      flushedCount: 0,
      remainingQueue: [],
      newConflicts: [],
      stoppedReason: 'completed',
    };
  }

  const ordered = [...queue].sort((a, b) => a.createdAt - b.createdAt);
  const resolvedTempIds = new Map<string, string>();
  const newConflicts: SyncConflict[] = [];
  let flushedCount = 0;

  for (let index = 0; index < ordered.length; index++) {
    const entry = rewriteEntryItemId(ordered[index], resolvedTempIds);

    if (entry.kind !== 'add' && entry.itemId.startsWith('offline-')) {
      newConflicts.push({
        id: createOfflineId('conflict'),
        mutation: entry,
        itemName: entry.itemName,
        message: 'Original offline item could not be created on the server.',
        failedAt: Date.now(),
      });
      continue;
    }

    try {
      if (entry.kind === 'add') {
        const row = await executor.add(entry.payload);
        resolvedTempIds.set(entry.tempId, row.id);
        callbacks.onAddResolved?.(entry.tempId, toFoodItem(row));
      } else if (entry.kind === 'update') {
        const row = await executor.update(entry.itemId, entry.patch);
        callbacks.onUpdateResolved?.(entry.itemId, toFoodItem(row));
      } else if (entry.kind === 'remove') {
        await executor.remove(entry.itemId);
        callbacks.onRemoveResolved?.(entry.itemId);
      } else {
        await executor.transition(entry.itemId, entry.action, entry.reason);
        callbacks.onRemoveResolved?.(entry.itemId);
      }
      flushedCount += 1;
    } catch (error) {
      if (isAuthOrAccessError(error)) {
        const remainingQueue = ordered
          .slice(index)
          .map((item) => rewriteEntryItemId(item, resolvedTempIds));
        return {
          flushedCount,
          remainingQueue,
          newConflicts,
          stoppedReason: 'auth',
          authErrorMessage: error instanceof Error ? error.message : undefined,
        };
      }

      if (isConnectivityError(error)) {
        const remainingQueue = ordered
          .slice(index)
          .map((item) => rewriteEntryItemId(item, resolvedTempIds));
        return {
          flushedCount,
          remainingQueue,
          newConflicts,
          stoppedReason: 'offline',
        };
      }

      newConflicts.push({
        id: createOfflineId('conflict'),
        mutation: entry,
        itemName: entry.itemName,
        message: formatMutationConflictMessage(error),
        failedAt: Date.now(),
      });
    }
  }

  return {
    flushedCount,
    remainingQueue: [],
    newConflicts,
    stoppedReason: 'completed',
  };
}

