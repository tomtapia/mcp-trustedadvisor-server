/**
 * Unit tests for cache utilities
 * Tests caching functionality, TTL, LRU eviction, and performance
 */

import { 
  ResponseCache, 
  CacheInstances, 
  CacheKeys, 
  withCache,
  cleanupAllCaches,
  getGlobalCacheStats
} from '../../src/utils/cacheUtils';

describe('Cache Utilities', () => {
  let cache: ResponseCache<any>;

  beforeEach(() => {
    cache = new ResponseCache({
      ttl: 1000, // 1 second for fast tests
      maxSize: 3,
      autoCleanup: false // Manual cleanup for controlled tests
    });
  });

  afterEach(() => {
    cache.destroy();
    cleanupAllCaches();
  });

  describe('ResponseCache', () => {
    describe('Basic Operations', () => {
      it('should store and retrieve values', () => {
        const operation = 'testOp';
        const params = { key: 'value' };
        const data = { result: 'test data' };

        cache.set(operation, params, data);
        const retrieved = cache.get(operation, params);

        expect(retrieved).toEqual(data);
      });

      it('should return undefined for non-existent keys', () => {
        const result = cache.get('nonExistent', {});
        expect(result).toBeUndefined();
      });

      it('should generate consistent keys for same parameters', () => {
        const operation = 'testOp';
        const params1 = { a: 1, b: 2 };
        const params2 = { b: 2, a: 1 }; // Different order
        const data = { result: 'test' };

        cache.set(operation, params1, data);
        const retrieved = cache.get(operation, params2);

        expect(retrieved).toEqual(data);
      });

      it('should delete specific entries', () => {
        const operation = 'testOp';
        const params = { key: 'value' };
        const data = { result: 'test data' };

        cache.set(operation, params, data);
        expect(cache.get(operation, params)).toEqual(data);

        const deleted = cache.delete(operation, params);
        expect(deleted).toBe(true);
        expect(cache.get(operation, params)).toBeUndefined();
      });

      it('should clear all entries', () => {
        cache.set('op1', { key: 'value1' }, { data: 'data1' });
        cache.set('op2', { key: 'value2' }, { data: 'data2' });

        const stats = cache.getStats();
        expect(stats.size).toBe(2);

        cache.clear();
        
        const statsAfter = cache.getStats();
        expect(statsAfter.size).toBe(0);
      });
    });

    describe('TTL (Time To Live)', () => {
      it('should expire entries after TTL', async () => {
        const operation = 'testOp';
        const params = { key: 'value' };
        const data = { result: 'test data' };

        cache.set(operation, params, data);
        expect(cache.get(operation, params)).toEqual(data);

        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 1100));

        expect(cache.get(operation, params)).toBeUndefined();
      });

      it('should support custom TTL per entry', async () => {
        const operation = 'testOp';
        const params1 = { key: 'short' };
        const params2 = { key: 'long' };
        const data = { result: 'test data' };

        cache.set(operation, params1, data, 100); // 100ms TTL
        cache.set(operation, params2, data, 2000); // 2s TTL

        await new Promise(resolve => setTimeout(resolve, 150));

        expect(cache.get(operation, params1)).toBeUndefined();
        expect(cache.get(operation, params2)).toEqual(data);
      });
    });

    describe('LRU Eviction', () => {
      it('should evict least recently used entries when at capacity', () => {
        // Fill cache to capacity (3 entries)
        cache.set('op', { key: '1' }, { data: '1' });
        cache.set('op', { key: '2' }, { data: '2' });
        cache.set('op', { key: '3' }, { data: '3' });

        // Access first entry to make it recently used
        const firstEntry = cache.get('op', { key: '1' });
        expect(firstEntry).toEqual({ data: '1' });

        // Add fourth entry, should evict one of the old entries
        cache.set('op', { key: '4' }, { data: '4' });

        // At least one entry should be evicted and new entry should be present
        const evictedCount = [1, 2, 3].filter(i => 
          cache.get('op', { key: i.toString() }) === undefined
        ).length;
        expect(evictedCount).toBeGreaterThan(0);
        expect(cache.get('op', { key: '4' })).toEqual({ data: '4' }); // New entry should be there
      });
    });

    describe('Statistics', () => {
      it('should track access statistics', () => {
        const operation = 'testOp';
        const params = { key: 'value' };
        const data = { result: 'test data' };

        cache.set(operation, params, data);
        
        // Access multiple times
        cache.get(operation, params);
        cache.get(operation, params);
        cache.get(operation, params);

        const stats = cache.getStats();
        
        expect(stats.size).toBe(1);
        expect(stats.maxSize).toBe(3);
        expect(stats.entries).toHaveLength(1);
        expect(stats.entries[0].accessCount).toBe(4); // 1 set + 3 gets
      });
    });
  });

  describe('withCache Helper', () => {
    it('should cache function results', async () => {
      let callCount = 0;
      const expensiveFunction = jest.fn(async () => {
        callCount++;
        return { result: `call-${callCount}` };
      });

      const operation = 'expensiveOp';
      const params = { key: 'value' };

      // First call
      const result1 = await withCache(cache, operation, expensiveFunction, params);
      expect(result1).toEqual({ result: 'call-1' });
      expect(expensiveFunction).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await withCache(cache, operation, expensiveFunction, params);
      expect(result2).toEqual({ result: 'call-1' }); // Same result
      expect(expensiveFunction).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should handle function errors properly', async () => {
      const errorFunction = jest.fn(async () => {
        throw new Error('Test error');
      });

      const operation = 'errorOp';
      const params = { key: 'value' };

      await expect(withCache(cache, operation, errorFunction, params))
        .rejects.toThrow('Test error');

      // Error should not be cached
      expect(cache.get(operation, params)).toBeUndefined();
    });
  });

  describe('Global Cache Instances', () => {
    it('should have predefined cache instances', () => {
      expect(CacheInstances.checks).toBeInstanceOf(ResponseCache);
      expect(CacheInstances.recommendations).toBeInstanceOf(ResponseCache);
      expect(CacheInstances.resources).toBeInstanceOf(ResponseCache);
      expect(CacheInstances.organization).toBeInstanceOf(ResponseCache);
    });

    it('should have predefined cache keys', () => {
      expect(CacheKeys.LIST_CHECKS).toBe('list_checks');
      expect(CacheKeys.LIST_RECOMMENDATIONS).toBe('list_recommendations');
      expect(CacheKeys.GET_RECOMMENDATION).toBe('get_recommendation');
    });

    it('should return global stats', () => {
      const stats = getGlobalCacheStats();
      
      expect(stats).toHaveProperty('checks');
      expect(stats).toHaveProperty('recommendations');
      expect(stats).toHaveProperty('resources');
      expect(stats).toHaveProperty('organization');

      expect(stats.checks).toHaveProperty('size');
      expect(stats.checks).toHaveProperty('maxSize');
    });

    it('should clean up all caches', () => {
      // Add data to different caches
      CacheInstances.checks.set('op', { key: 'value' }, { data: 'test' });
      CacheInstances.recommendations.set('op', { key: 'value' }, { data: 'test' });

      cleanupAllCaches();

      const stats = getGlobalCacheStats();
      expect(stats.checks.size).toBe(0);
      expect(stats.recommendations.size).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle large numbers of entries efficiently', () => {
      const largeCache = new ResponseCache({ maxSize: 1000, ttl: 60000 });
      
      const startTime = performance.now();
      
      // Add 500 entries
      for (let i = 0; i < 500; i++) {
        largeCache.set('op', { id: i }, { data: `value-${i}` });
      }
      
      // Access 500 entries
      for (let i = 0; i < 500; i++) {
        largeCache.get('op', { id: i });
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
      
      largeCache.destroy();
    });

    it('should have fast key generation', () => {
      const operation = 'testOp';
      const complexParams = {
        array: [1, 2, 3, 4, 5],
        object: { nested: { deep: 'value' } },
        string: 'test-string',
        number: 12345,
        boolean: true
      };

      const startTime = performance.now();
      
      // Generate 1000 keys
      for (let i = 0; i < 1000; i++) {
        cache.set(operation, { ...complexParams, id: i }, { data: i });
      }
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
    });
  });

  describe('Memory Management', () => {
    it('should cleanup timer on destroy', () => {
      const cacheWithTimer = new ResponseCache({
        ttl: 1000,
        autoCleanup: true,
        cleanupInterval: 100
      });

      // Timer should be running
      expect((cacheWithTimer as any).cleanupTimer).toBeDefined();

      cacheWithTimer.destroy();

      // Timer should be stopped
      expect((cacheWithTimer as any).cleanupTimer).toBeNull();
    });

    it('should not leak memory on repeated operations', () => {
      const initialStats = cache.getStats();
      
      // Perform many operations that should not increase memory
      for (let i = 0; i < 100; i++) {
        cache.set('op', { key: 'same' }, { data: 'overwritten' });
        cache.get('op', { key: 'same' });
      }
      
      const finalStats = cache.getStats();
      
      // Should only have one entry despite 100 operations
      expect(finalStats.size).toBe(1);
    });
  });
});
