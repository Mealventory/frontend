import Constants from 'expo-constants';
import type { MMKV } from 'react-native-mmkv';

type StringStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

declare const require: (moduleName: 'react-native-mmkv') => {
  createMMKV: (configuration?: { id?: string }) => MMKV;
};

const memoryValues = new Map<string, string>();

const memoryStorage: StringStorage = {
  getItem(key) {
    return memoryValues.get(key) ?? null;
  },
  setItem(key, value) {
    memoryValues.set(key, value);
  },
  removeItem(key) {
    memoryValues.delete(key);
  },
};

function createNativeStorage(): StringStorage {
  const { createMMKV } = require('react-native-mmkv');
  const storage = createMMKV({
    id: 'mealventory-sync-cache',
  });

  return {
    getItem(key) {
      return storage.getString(key) ?? null;
    },
    setItem(key, value) {
      storage.set(key, value);
    },
    removeItem(key) {
      storage.remove(key);
    },
  };
}

// Expo Go does not bundle Nitro/MMKV. Keep ordinary Expo Go development usable,
// while development/release builds get the real synchronous disk cache.
export const queryStorage: StringStorage =
  Constants.appOwnership === 'expo' ? memoryStorage : createNativeStorage();
