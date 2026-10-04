import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { queryStorage } from './storage';

export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;
export const QUERY_CACHE_BUSTER = 'mealventory-inventory-v1';
export const INVENTORY_QUERY_ROOT = 'inventory';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: QUERY_CACHE_MAX_AGE,
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: queryStorage,
  key: 'MEALVENTORY_QUERY_CACHE',
  throttleTime: 500,
});

export function inventoryQueryKey(userId?: string | null, householdId?: string | null) {
  return [
    INVENTORY_QUERY_ROOT,
    userId || 'signed-out',
    householdId || 'no-household',
  ] as const;
}

export function shouldPersistQuery(query: {
  queryKey: readonly unknown[];
  state: { status: string };
}) {
  return query.queryKey[0] === INVENTORY_QUERY_ROOT && query.state.status === 'success';
}
