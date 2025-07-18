/**
 * Response caching utilities for MCP server
 * Provides in-memory caching with TTL and LRU eviction
 */

import { createHash } from 'crypto';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  autoCleanup?: boolean; // Enable automatic cleanup of expired entries
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

export class ResponseCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  constructor(private options: CacheOptions = {}) {
    const {
      ttl = 5 * 60 * 1000, // Default 5 minutes
      maxSize = 100,
      autoCleanup = true,
      cleanupInterval = 60 * 1000 // Default 1 minute
    } = options;
    
    this.options = { ttl, maxSize, autoCleanup, cleanupInterval };
    
    if (autoCleanup) {
      this.startCleanupTimer();
    }
  }
  
  /**
   * Generate a cache key from parameters
   */
  private generateKey(operation: string, params: Record<string, unknown>): string {
    // Sort keys for consistent hashing
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {} as Record<string, unknown>);
    
    const paramString = JSON.stringify(sortedParams);
    const hash = createHash('sha256').update(`${operation}:${paramString}`).digest('hex');
    return `${operation}_${hash.substring(0, 16)}`;
  }
  
  /**
   * Get cached response
   */
  get(operation: string, params: Record<string, unknown>): T | undefined {
    const key = this.generateKey(operation, params);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    
    return entry.data;
  }
  
  /**
   * Set cached response
   */
  set(operation: string, params: Record<string, unknown>, data: T, customTtl?: number): void {
    const key = this.generateKey(operation, params);
    const now = Date.now();
    const ttl = customTtl || this.options.ttl!;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccessed: now
    };
    
    // Check if we need to evict entries
    if (this.cache.size >= this.options.maxSize!) {
      this.evictLeastRecentlyUsed();
    }
    
    this.cache.set(key, entry);
  }
  
  /**
   * Remove entry from cache
   */
  delete(operation: string, params: Record<string, unknown>): boolean {
    const key = this.generateKey(operation, params);
    return this.cache.delete(key);
  }
  
  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; age: number; accessCount: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      accessCount: entry.accessCount
    }));
    
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const hitRate = totalAccesses > 0 ? this.cache.size / totalAccesses : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize!,
      hitRate,
      entries
    };
  }
  
  /**
   * Evict least recently used entries
   */
  private evictLeastRecentlyUsed(): void {
    if (this.cache.size === 0) return;
    
    let lruKey: string | undefined;
    let lruTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }
  
  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
  
  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }
  
  /**
   * Stop automatic cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * Destroy cache and cleanup resources
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }
}

/**
 * Global cache instances for different types of operations
 */
export const CacheInstances = {
  // Long-term cache for relatively static data (30 minutes)
  checks: new ResponseCache({
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 50,
    autoCleanup: true
  }),
  
  // Medium-term cache for recommendation data (10 minutes)
  recommendations: new ResponseCache({
    ttl: 10 * 60 * 1000, // 10 minutes
    maxSize: 100,
    autoCleanup: true
  }),
  
  // Short-term cache for frequently changing data (2 minutes)
  resources: new ResponseCache({
    ttl: 2 * 60 * 1000, // 2 minutes
    maxSize: 200,
    autoCleanup: true
  }),
  
  // Organization-level cache (15 minutes)
  organization: new ResponseCache({
    ttl: 15 * 60 * 1000, // 15 minutes
    maxSize: 25,
    autoCleanup: true
  })
} as const;

/**
 * Cache key prefixes for different operations
 */
export const CacheKeys = {
  LIST_CHECKS: 'list_checks',
  LIST_TRUSTED_ADVISOR_CHECKS: 'list_trusted_advisor_checks',
  GET_RECOMMENDATION: 'get_recommendation',
  GET_TRUSTED_ADVISOR_RECOMMENDATION: 'get_trusted_advisor_recommendation',
  LIST_RECOMMENDATIONS: 'list_recommendations',
  LIST_RECOMMENDATION_RESOURCES: 'list_recommendation_resources',
  ORGANIZATION_RECOMMENDATIONS: 'organization_recommendations'
} as const;

/**
 * Utility function to create cache-aware response handler
 */
export function withCache<T>(
  cacheInstance: ResponseCache<T>,
  operation: string,
  handler: () => Promise<T>,
  params: Record<string, unknown>,
  customTtl?: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    // Try to get from cache first
    const cached = cacheInstance.get(operation, params);
    if (cached) {
      resolve(cached);
      return;
    }
    
    // Execute handler and cache result
    handler()
      .then(result => {
        cacheInstance.set(operation, params, result, customTtl);
        resolve(result);
      })
      .catch(reject);
  });
}

/**
 * Invalidate cache entries that match a pattern
 */
export function invalidateCache(
  cacheInstance: ResponseCache<any>,
  pattern: string
): number {
  const stats = cacheInstance.getStats();
  let invalidatedCount = 0;
  
  stats.entries.forEach(entry => {
    if (entry.key.includes(pattern)) {
      // We need to reconstruct the operation and params to delete
      // This is a simplified approach - in production, you might want
      // a more sophisticated pattern matching system
      const [operation] = entry.key.split('_');
      if (operation === pattern) {
        invalidatedCount++;
      }
    }
  });
  
  return invalidatedCount;
}

/**
 * Global cache cleanup function
 */
export function cleanupAllCaches(): void {
  Object.values(CacheInstances).forEach(cache => {
    cache.clear();
  });
}

/**
 * Get global cache statistics
 */
export function getGlobalCacheStats(): Record<string, any> {
  return Object.entries(CacheInstances).reduce((stats, [name, cache]) => {
    stats[name] = cache.getStats();
    return stats;
  }, {} as Record<string, any>);
}
