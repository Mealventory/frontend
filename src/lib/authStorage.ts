import { Platform } from 'react-native';

export interface AuthStorageAdapter {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

export interface SecureStoreModule {
  getItemAsync: (key: string, options?: any) => Promise<string | null>;
  setItemAsync: (key: string, value: string, options?: any) => Promise<void>;
  deleteItemAsync: (key: string, options?: any) => Promise<void>;
}

/**
 * Expo SecureStore only allows alphanumeric characters, '.', '-', and '_'.
 * Replace any other characters with a safe deterministic hexadecimal encoding.
 */
export function toSafeSecureStoreKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, (char) => `_${char.charCodeAt(0).toString(16)}_`);
}

/**
 * Android Keystore and some device providers have a 2048-byte limit per entry.
 * We chunk values larger than 1800 characters across multiple keys.
 */
export const CHUNK_SIZE = 1800;

export function createSecureStoreAdapter(customStore?: SecureStoreModule | null): AuthStorageAdapter {
  const getStore = (): SecureStoreModule | null => {
    if (customStore) return customStore;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('expo-secure-store');
    } catch {
      return null;
    }
  };

  const memoryFallback = new Map<string, string>();

  const cleanupChunks = async (safeKey: string, store: SecureStoreModule) => {
    try {
      const chunkCountStr = await store.getItemAsync(`${safeKey}_chunks`);
      if (chunkCountStr) {
        const count = parseInt(chunkCountStr, 10);
        if (!isNaN(count)) {
          for (let i = 0; i < count; i++) {
            await store.deleteItemAsync(`${safeKey}_chunk_${i}`).catch(() => {});
          }
        }
        await store.deleteItemAsync(`${safeKey}_chunks`).catch(() => {});
      }
    } catch {}
  };

  return {
    async getItem(key: string): Promise<string | null> {
      const store = getStore();
      if (!store) {
        return memoryFallback.get(key) ?? null;
      }
      const safeKey = toSafeSecureStoreKey(key);
      try {
        const chunkCountStr = await store.getItemAsync(`${safeKey}_chunks`);
        if (chunkCountStr) {
          const count = parseInt(chunkCountStr, 10);
          if (!isNaN(count) && count > 0) {
            const chunks: string[] = [];
            for (let i = 0; i < count; i++) {
              const chunk = await store.getItemAsync(`${safeKey}_chunk_${i}`);
              if (chunk === null) {
                return null;
              }
              chunks.push(chunk);
            }
            return chunks.join('');
          }
        }
        return await store.getItemAsync(safeKey);
      } catch {
        return null;
      }
    },

    async setItem(key: string, value: string): Promise<void> {
      const store = getStore();
      if (!store) {
        memoryFallback.set(key, value);
        return;
      }
      const safeKey = toSafeSecureStoreKey(key);
      try {
        if (value.length <= CHUNK_SIZE) {
          await store.setItemAsync(safeKey, value);
          await cleanupChunks(safeKey, store);
        } else {
          const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
          for (let i = 0; i < chunkCount; i++) {
            const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
            await store.setItemAsync(`${safeKey}_chunk_${i}`, chunk);
          }
          await store.setItemAsync(`${safeKey}_chunks`, String(chunkCount));
          await store.deleteItemAsync(safeKey).catch(() => {});
        }
      } catch {
        memoryFallback.set(key, value);
      }
    },

    async removeItem(key: string): Promise<void> {
      memoryFallback.delete(key);
      const store = getStore();
      if (!store) return;
      const safeKey = toSafeSecureStoreKey(key);
      try {
        await store.deleteItemAsync(safeKey).catch(() => {});
        await cleanupChunks(safeKey, store);
      } catch {}
    },
  };
}

export function createWebStorageAdapter(customStorage?: Storage): AuthStorageAdapter {
  const memoryFallback = new Map<string, string>();

  const getStorage = (): Storage | null => {
    if (customStorage) return customStorage;
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  };

  return {
    getItem(key: string): string | null {
      const store = getStorage();
      if (store) {
        try {
          return store.getItem(key);
        } catch {
          return memoryFallback.get(key) ?? null;
        }
      }
      return memoryFallback.get(key) ?? null;
    },

    setItem(key: string, value: string): void {
      const store = getStorage();
      if (store) {
        try {
          store.setItem(key, value);
          return;
        } catch {
          memoryFallback.set(key, value);
          return;
        }
      }
      memoryFallback.set(key, value);
    },

    removeItem(key: string): void {
      memoryFallback.delete(key);
      const store = getStorage();
      if (store) {
        try {
          store.removeItem(key);
        } catch {}
      }
    },
  };
}

export const nativeSecureStoreAdapter = createSecureStoreAdapter();
export const webAuthStorageAdapter = createWebStorageAdapter();

export const authStorageAdapter: AuthStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return webAuthStorageAdapter.getItem(key);
    }
    return nativeSecureStoreAdapter.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return webAuthStorageAdapter.setItem(key, value);
    }
    return nativeSecureStoreAdapter.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      return webAuthStorageAdapter.removeItem(key);
    }
    return nativeSecureStoreAdapter.removeItem(key);
  },
};
