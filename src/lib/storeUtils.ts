import { getStorageSuffix } from "./praticaStore";

export function getStoreKey(baseKey: string): string {
  return baseKey + getStorageSuffix();
}

export function read<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(getStoreKey(key));
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function write<T>(key: string, value: T): void {
  localStorage.setItem(getStoreKey(key), JSON.stringify(value));
}
