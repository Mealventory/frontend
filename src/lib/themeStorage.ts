import { Platform } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'mealventory_theme_preference';

export interface SecureStoreModule {
  getItemAsync: (key: string, options?: any) => Promise<string | null>;
  setItemAsync: (key: string, value: string, options?: any) => Promise<void>;
  deleteItemAsync: (key: string, options?: any) => Promise<void>;
}

export function isValidThemePreference(val: unknown): val is ThemePreference {
  return val === 'system' || val === 'light' || val === 'dark';
}

/**
 * Synchronously retrieves initial web theme preference if available.
 * Also applies the theme class to document.documentElement immediately to avoid startup flash.
 */
export function getWebInitialPreference(customWebStorage?: Storage | null): ThemePreference | null {
  if (customWebStorage === undefined && Platform.OS !== 'web' && typeof window === 'undefined') return null;
  try {
    const storage = customWebStorage !== undefined
      ? customWebStorage
      : (typeof window !== 'undefined' ? window.localStorage : null);
    if (!storage) return null;
    const item = storage.getItem(THEME_STORAGE_KEY);
    return isValidThemePreference(item) ? item : null;
  } catch {
    return null;
  }
}

/**
 * Immediately applies dark class on web during module evaluation if preferred,
 * preventing a visible light-to-dark flash before React hydration.
 */
export function applyWebInitialThemeClass(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  try {
    const pref = getWebInitialPreference();
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = pref === 'dark' || (pref === 'system' && systemDark) || (!pref && systemDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch {}
}

// Run immediately in browser environment
applyWebInitialThemeClass();

export function createThemeStorage(
  customSecureStore?: SecureStoreModule | null,
  customWebStorage?: Storage | null
) {
  const memoryFallback = new Map<string, string>();

  const getStore = (): SecureStoreModule | null => {
    if (customSecureStore !== undefined) return customSecureStore;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('expo-secure-store');
    } catch {
      return null;
    }
  };

  const getWebStorage = (): Storage | null => {
    if (customWebStorage !== undefined) return customWebStorage;
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  };

  return {
    async getPreference(): Promise<ThemePreference | null> {
      try {
        if (Platform.OS === 'web') {
          const webStore = getWebStorage();
          if (webStore) {
            const val = webStore.getItem(THEME_STORAGE_KEY);
            return isValidThemePreference(val) ? val : null;
          }
          const mem = memoryFallback.get(THEME_STORAGE_KEY);
          return isValidThemePreference(mem) ? mem : null;
        }

        const store = getStore();
        if (!store) {
          const mem = memoryFallback.get(THEME_STORAGE_KEY);
          return isValidThemePreference(mem) ? mem : null;
        }
        const val = await store.getItemAsync(THEME_STORAGE_KEY);
        return isValidThemePreference(val) ? val : null;
      } catch {
        return null;
      }
    },

    async setPreference(pref: ThemePreference): Promise<void> {
      try {
        if (Platform.OS === 'web') {
          const webStore = getWebStorage();
          if (webStore) {
            webStore.setItem(THEME_STORAGE_KEY, pref);
            return;
          }
          memoryFallback.set(THEME_STORAGE_KEY, pref);
          return;
        }

        const store = getStore();
        if (!store) {
          memoryFallback.set(THEME_STORAGE_KEY, pref);
          return;
        }
        await store.setItemAsync(THEME_STORAGE_KEY, pref);
      } catch {
        memoryFallback.set(THEME_STORAGE_KEY, pref);
      }
    },

    async clearPreference(): Promise<void> {
      memoryFallback.delete(THEME_STORAGE_KEY);
      try {
        if (Platform.OS === 'web') {
          const webStore = getWebStorage();
          if (webStore) {
            webStore.removeItem(THEME_STORAGE_KEY);
          }
          return;
        }
        const store = getStore();
        if (store) {
          await store.deleteItemAsync(THEME_STORAGE_KEY);
        }
      } catch {}
    },
  };
}

export const themeStorage = createThemeStorage();
