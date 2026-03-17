# Decorator Pattern - Mẫu Thiết Kế Decorator

## 1. Giới thiệu Pattern

**Decorator** là mẫu thiết kế thuộc nhóm **Structural** (Cấu trúc), cho phép thêm behavior vào đối tượng một cách linh hoạt mà không thay đổi class gốc. Decorator cung cấp alternative cho việc subclass để mở rộng chức năng.

---

## 2. Bối cảnh áp dụng

Trong hệ thống QR Attendance, có những method được gọi nhiều lần nhưng dữ liệu ít thay đổi:
- `findAll()` - Danh sách lớp học hiếm khi thay đổi
- `getClassAttendanceReport()` - Báo cáo điểm danh
- `getAttendanceAnalyticsOverview()` - Thống kê tổng quan

Gọi database mỗi lần tốn kém, cần caching nhưng không muốn sửa code gốc.

---

## 3. Code Cũ (Không dùng Decorator)

**File:** `src/classes/classes.service.ts`

```typescript
@Injectable()
export class ClassesService {
  private classCache = new Map<string, { data: any; expires: number }>();
  private readonly CACHE_TTL = 300000; // 5 phút

  async findAll() {
    const cacheKey = 'all_classes';
    const cached = this.classCache.get(cacheKey);

    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const classes = await this.prisma.class.findMany({
      include: { lecturer: true }
    });

    this.classCache.set(cacheKey, {
      data: classes,
      expires: Date.now() + this.CACHE_TTL
    });

    return classes;
  }
}

// File attendance.service.ts - lại phải viết caching thủ công
@Injectable()
export class AttendanceService {
  private reportCache = new Map<string, { data: any; expires: number }>();
  // Lại lặp lại code caching...
}
```

---

## 4. Code Mới (Sử dụng Decorator)

**File:** `src/common/decorators/cache-decorator.ts`

```typescript
import { Injectable } from '@nestjs/common';

export interface CacheOptions {
  ttl: number;
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
      const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

      const cached = globalCacheStore.get(cacheKey);
      if (cached !== undefined) {
        console.log(`[CACHE HIT] ${cacheKey}`);
        return cached;
      }

      console.log(`[CACHE MISS] ${cacheKey}`);
      const result = await originalMethod.apply(this, args);

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
```

---

## 5. Cách sử dụng

**File:** `src/classes/classes.service.ts`

```typescript
import { Cached, invalidateCache } from '../common/decorators/cache-decorator';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  @Cached(300) // Cache 5 phút
  async findAll() {
    return this.prisma.class.findMany({
      include: {
        sessions: { orderBy: { createdAt: 'desc' } },
        _count: { select: { students: true } },
        lecturer: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Cached(300) // Cache 5 phút
  async findOne(id: string) {
    return this.prisma.class.findUnique({
      where: { id },
      include: { students: true, sessions: true, lecturer: true },
    });
  }

  async create(createClassDto: CreateClassDto) {
    const result = await this.prisma.class.create({ data: createClassDto });
    // Invalidate cache after create
    invalidateCache('ClassesService:findAll');
    invalidateCache('ClassesService:findOne');
    return result;
  }
}
```

**File:** `src/attendance/attendance.service.ts`

```typescript
import { Cached, invalidateCache } from '../common/decorators/cache-decorator';

@Injectable()
export class AttendanceService {
  @Cached(120) // Cache 2 phút
  async getClassAttendanceReport(classId: string) {
    // ... logic phức tạp
  }

  @Cached(60) // Cache 1 phút
  async getAllClassesAttendanceReport() {
    // ... logic phức tạp
  }

  // NOTE: Không dùng @Cached vì dữ liệu live sessions cần real-time
  // Bug từng gặp: @Cached(60) khiến admin dashboard không cập nhật
  // live sessions → đã bỏ cache và thêm polling ở frontend
  async getAttendanceAnalyticsOverview() {
    // ... logic phức tạp
  }

  private invalidateAttendanceCaches() {
    invalidateCache('AttendanceService:.*Report');
    invalidateCache('AttendanceService:.*Analytics');
  }
}
```

---

## 6. ⚠️ Lưu ý quan trọng: Khi nào KHÔNG nên dùng @Cached

### Bug đã gặp:
- **Vấn đề:** `getAttendanceAnalyticsOverview()` có `@Cached(60)` khiến admin dashboard không cập nhật live sessions khi lecturer tạo lớp mới
- **Root cause:** Cache 60s trả về dữ liệu cũ, không thấy session mới tạo
- **Giải pháp:**
  1. Backend: Bỏ `@Cached` trên method trả về dữ liệu real-time
  2. Frontend: Thêm polling (30s) để refresh dữ liệu

### Nguyên tắc áp dụng @Cached:
- ✅ Dùng cho: dữ liệu ít thay đổi (danh sách lớp, báo cáo cũ)
- ❌ Không dùng cho: dữ liệu real-time (live sessions, attendance đang diễn ra)

---

## 7. Giải thích tại sao áp dụng Decorator

### Vấn đề gặp phải:
- Code caching lặp lại trong nhiều service
- Không thể tái sử dụng logic caching
- Sửa một nơi ảnh hưởng nhiều nơi
- Vi phạm DRY (Don't Repeat Yourself)

### Giải pháp Decorator:
- Tạo decorator @Cached() có thể tái sử dụng
- Áp dụng cho bất kỳ method nào
- Không sửa code gốc

---

## 7. Lợi ích của Decorator Pattern

| Tiêu chí | Trước khi dùng Decorator | Sau khi dùng Decorator |
|----------|-------------------------|----------------------|
| **Code trùng lặp** | Nhiều | Không có |
| **Tái sử dụng** | Không | Có (@Cached) |
| **Sửa code gốc** | Cần | Không cần |
| **Thêm/bớt cache** | Sửa nhiều nơi | Thêm/xóa @Cached |

### Các lợi ích cụ thể:

1. **DRY**
   - Không lặp lại code caching

2. **Non-invasive**
   - Không sửa code gốc

3. **Reusable**
   - Áp dụng cho bất kỳ method nào

4. **Flexible**
   - Config TTL dễ dàng

---

## 8. Sơ đồ Class

```mermaid
classDiagram
    class <<interface>> CacheStore {
        +get~T~(key: string): T | undefined
        +set~T~(key: string, value: T, ttl: number): void
        +delete(key: string): void
        +deleteByPattern(pattern: string): void
        +clear(): void
    }

    class InMemoryCacheStore {
        -static instance: InMemoryCacheStore
        -cache: Map~string, object~
        +get~T~(key: string): T | undefined
        +set~T~(key: string, value: T, ttl: number): void
        +delete(key: string): void
        +deleteByPattern(pattern: string): void
        +clear(): void
    }

    CacheStore <|.. InMemoryCacheStore

    class Cached {
        <<decorator>>
        +ttlSeconds: number
        +execute(target, propertyKey, descriptor): PropertyDescriptor
    }

    Cached --> InMemoryCacheStore : uses globalCacheStore

    class ClassesService {
        +findAll(): Promise~Class[]~
        +findOne(id: string): Promise~Class~
        +create(dto: CreateClassDto): Promise~Class~
    }

    class AttendanceService {
        +getClassAttendanceReport(classId: string): Promise~object~
        +getAllClassesAttendanceReport(): Promise~object[]~
        +getAttendanceAnalyticsOverview(): Promise~object~ <<no cache>>
    }

    Cached ..> ClassesService : decorates findAll, findOne
    Cached ..> AttendanceService : decorates reports (except getAttendanceAnalyticsOverview)
```

---

## 9. ✅ Bug đã fix liên quan Decorator

### Vấn đề:
- Admin dashboard không cập nhật "Buổi đang diễn ra" khi lecturer tạo session mới
- Nguyên nhân: `@Cached(60)` trên `getAttendanceAnalyticsOverview()`

### Giải pháp:
1. **Backend:** Bỏ `@Cached` trên `getAttendanceAnalyticsOverview()`
2. **Frontend:** Thêm polling 30s cho AdminReports.tsx

### Code frontend polling:
```typescript
const POLLING_INTERVAL = 30000;

useEffect(() => {
  fetchAnalytics();
  pollingRef.current = setInterval(() => fetchAnalytics(true), POLLING_INTERVAL);
  return () => clearInterval(pollingRef.current);
}, []);
```

---

## 10. Kết luận

Decorator Pattern giúp thêm chức năng mà không sửa code gốc:

- ✅ Giảm code trùng lặp đáng kể
- ✅ Thêm/bớt caching dễ dàng
- ✅ Không sửa code gốc
- ✅ Tái sử dụng được
- ⚠️ Cẩn thận với dữ liệu real-time - KHÔNG cache!

**Khuyến nghị:** Sử dụng Decorator khi cần thêm behavior (logging, caching, timing...) cho nhiều method mà không muốn sửa code gốc.
