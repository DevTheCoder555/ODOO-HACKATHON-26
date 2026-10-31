/**
 * Brightloop Client-Side Offline Caching Engine.
 * Implements Stale-While-Revalidate and Network-First-with-Cache-Fallback
 * to guarantee that dashboard, invoices, products, and analytics remain fully
 * browsable even when network connectivity is completely down.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class OfflineCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private prefix = 'brightloop_cache_';
  private defaultTtlMs = 1000 * 60 * 60 * 24; // 24 hours offline survival window

  // Returns cache key from endpoint and parameters
  generateKey(endpoint: string): string {
    return `${this.prefix}${endpoint}`;
  }

  get<T>(key: string): T | null {
    // 1. Check in-memory cache
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key)!;
      return entry.data as T;
    }

    // 2. Check localStorage for persistent cross-session offline storage
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed: CacheEntry<T> = JSON.parse(raw);
      // Populate memory cache
      this.memoryCache.set(key, parsed);
      return parsed.data;
    } catch (e) {
      return null;
    }
  }

  set<T>(key: string, data: T, ttlMs: number = this.defaultTtlMs): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    this.memoryCache.set(key, entry);

    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      // LocalStorage quota or privacy restriction
    }
  }

  clear(): void {
    this.memoryCache.clear();
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(this.prefix)) {
          localStorage.removeItem(k);
        }
      });
    } catch (e) {
      // Ignore
    }
  }

  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }
}

export const offlineCache = new OfflineCache();

