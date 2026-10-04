import { createMMKV } from 'react-native-mmkv';

export const appStorage = createMMKV({
  id: 'mealventory-sync-cache',
});

export const queryStorage = {
  getItem(key: string) {
    return appStorage.getString(key) ?? null;
  },
  setItem(key: string, value: string) {
    appStorage.set(key, value);
  },
  removeItem(key: string) {
    appStorage.remove(key);
  },
};
