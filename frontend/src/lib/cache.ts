// Simple in-memory cache for reducing API calls
interface CacheEntry<T> {
  data: T
  timestamp: number
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 60000 // 1 minute default

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl,
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired
    if (Date.now() > entry.timestamp) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    if (Date.now() > entry.timestamp) {
      this.cache.delete(key)
      return false
    }
    
    return true
  }
}

export const cache = new SimpleCache()
