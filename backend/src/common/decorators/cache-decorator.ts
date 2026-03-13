/**
 * DECORATOR PATTERN - Caching Decorator
 * 
 * Bối cảnh: Một số service cần caching để tăng performance:
 * - Lấy thông tin lớp học
 * - Lấy danh sách sinh viên
 * - Lấy thống kê điểm danh
 * 
 * Decorator pattern cho phép thêm caching vào service mà không thay đổi
 * code gốc của service, tuân theo Open/Closed Principle
 */

import { Injectable } from '@nestjs/common';

export interface CacheOptions {
  ttl: number; // Time to live in seconds
  key: string;
}

/**
 * Cache Store Interface
 */
export interface CacheStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl: number): void;
  delete(key: string): void;
  deleteByPattern(pattern: string): void;
  clear(): void;
}

/**
 * In-memory Cache Store Implementation (Singleton)
 */
@Injectable()
export class InMemoryCacheStore implements CacheStore {
  private static instance: InMemoryCacheStore;
  private cache = new Map<string, { value: any; expiresAt: number }>();

  constructor() {
    if (InMemoryCacheStore.instance) {
      return InMemoryCacheStore.instance;
    }
    InMemoryCacheStore.instance = this;
  }

  get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value as T;
  }

  set<T>(key: string, value: T, ttl: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deleteByPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global singleton cache store
const globalCacheStore = new InMemoryCacheStore();

/**
 * Decorator Factory - Tạo cached version của service method
 */
export function Cached(ttlSeconds: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Tạo cache key từ method name và arguments
      const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      
      // Thử lấy từ cache
      const cached = globalCacheStore.get(cacheKey);
      if (cached !== undefined) {
        console.log(`[CACHE HIT] ${cacheKey}`);
        return cached;
      }

      console.log(`[CACHE MISS] ${cacheKey}`);
      // Gọi method gốc
      const result = await originalMethod.apply(this, args);
      
      // Lưu vào cache
      globalCacheStore.set(cacheKey, result, ttlSeconds);
      
      return result;
    };

    return descriptor;
  };
}

/**
 * Helper function to invalidate cache by pattern
 */
export function invalidateCache(pattern: string): void {
  globalCacheStore.deleteByPattern(pattern);
  console.log(`[CACHE INVALIDATE] Pattern: ${pattern}`);
}

/**
 * Helper function to clear all cache
 */
export function clearAllCache(): void {
  globalCacheStore.clear();
  console.log(`[CACHE CLEAR] All cache cleared`);
}

