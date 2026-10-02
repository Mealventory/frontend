import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { CompletionRecord } from './recipeCompletion';

const keyFor = (scope: string) => 'meal-review.' + Array.from(scope).map(c => c.charCodeAt(0).toString(16)).join('-');
const chunkSize = 400; // Also fits native limits with multibyte ingredient names.
export async function readCompletion(scope: string): Promise<CompletionRecord | null> {
  const key = keyFor(scope);
  if (Platform.OS === 'web') {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  const manifest = JSON.parse(raw);
  const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) => SecureStore.getItemAsync(`${key}.${manifest.version}.${i}`)));
  if (chunks.some(chunk => chunk === null)) throw new Error('The saved meal review could not be read. Please retry.');
  return JSON.parse(chunks.join(''));
}
export async function writeCompletion(scope: string, record: CompletionRecord | null) {
  const key = keyFor(scope);
  if (Platform.OS === 'web') {
    if (record) localStorage.setItem(key, JSON.stringify(record)); else localStorage.removeItem(key);
    return;
  }
  const previous = await SecureStore.getItemAsync(key);
  if (record) {
    const value = JSON.stringify(record);
    const version = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const count = Math.ceil(value.length / chunkSize);
    // Publish the pointer last: interrupted writes leave the prior retry record intact.
    for (let i = 0; i < count; i++) await SecureStore.setItemAsync(`${key}.${version}.${i}`, value.slice(i * chunkSize, (i + 1) * chunkSize));
    await SecureStore.setItemAsync(key, JSON.stringify({ version, count }));
  } else await SecureStore.deleteItemAsync(key);
  if (previous) {
    const manifest = JSON.parse(previous);
    for (let i = 0; i < manifest.count; i++) await SecureStore.deleteItemAsync(`${key}.${manifest.version}.${i}`).catch(() => {});
  }
}
