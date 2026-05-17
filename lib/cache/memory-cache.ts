export type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export function isFresh<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
  return Boolean(entry && entry.expiresAt > Date.now());
}
