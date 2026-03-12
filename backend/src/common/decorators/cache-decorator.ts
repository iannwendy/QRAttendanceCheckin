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
  clear(): void;
}

/**
 * In-memory Cache Store Implementation
 */
@Injectable()
export class InMemoryCacheStore implements CacheStore {
  private cache = new Map<string, { value: any; expiresAt: number }>();

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

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Decorator Factory - Tạo cached version của service method
 */
export function cached(ttlSeconds: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const cacheStore = new InMemoryCacheStore();

    descriptor.value = async function (...args: any[]) {
      // Tạo cache key từ method name và arguments
      const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      
      // Thử lấy từ cache
      const cached = cacheStore.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      // Gọi method gốc
      const result = await originalMethod.apply(this, args);
      
      // Lưu vào cache
      cacheStore.set(cacheKey, result, ttlSeconds);
      
      return result;
    };

    return descriptor;
  };
}

/**
 * Cache Decorator cho Classes Service
 */
@Injectable()
export class CachedClassesService {
  private cache: CacheStore;

  constructor(private originalService: any) {
    this.cache = new InMemoryCacheStore();
  }

  @cached(300) // Cache 5 phút
  async findAll() {
    return this.originalService.findAll();
  }

  @cached(300)
  async findOne(id: string) {
    return this.originalService.findOne(id);
  }

  /**
   * Xóa cache khi có thay đổi
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Cache Decorator cho Attendance Service
 */
@Injectable()
export class CachedAttendanceService {
  private cache: CacheStore;

  constructor(private originalService: any) {
    this.cache = new InMemoryCacheStore();
  }

  @cached(60) // Cache 1 phút cho analytics
  async getAttendanceAnalyticsOverview() {
    return this.originalService.getAttendanceAnalyticsOverview();
  }

  @cached(60)
  async getAllClassesAttendanceReport() {
    return this.originalService.getAllClassesAttendanceReport();
  }

  @cached(120) // Cache 2 phút cho report của một lớp
  async getClassAttendanceReport(classId: string) {
    // Tạo cache key riêng cho từng classId
    const cacheKey = `AttendanceService:getClassAttendanceReport:${classId}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const result = await this.originalService.getClassAttendanceReport(classId);
    this.cache.set(cacheKey, result, 120);
    return result;
  }

  /**
   * Xóa cache khi có thay đổi attendance
   */
  clearCache(): void {
    this.cache.clear();
  }
}

