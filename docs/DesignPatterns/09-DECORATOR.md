# Decorator Pattern - Mẫu Thiết Kế Decorator

## 1. Giới thiệu Pattern

**Decorator** là mẫu thiết kế thuộc nhóm **Structural** (Cấu trúc), cho phép thêm поведение (behavior) vào đối tượng một cách linh hoạt mà không thay đổi class gốc. Decorator cung cấp alternative cho việc subclass để mở rộng chức năng.

---

## 2. Bối cảnh áp dụng

Trong hệ thống QR Attendance, có những method được gọi nhiều lần nhưng dữ liệu ít thay đổi:
- `findAllClasses()` - Danh sách lớp học hiếm khi thay đổi
- `getAllSessions()` - Danh sách buổi học trong ngày
- `getStudentList()` - Danh sách sinh viên

Gọi database mỗi lần tốn kém, cần caching nhưng không muốn sửa code gốc.

---

## 3. Code Cũ (Không dùng Decorator)

**File:** `src/classes/classes.service.ts`

```typescript
@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  // Method không có caching
  async findAll() {
    return await this.prisma.class.findMany({
      where: { isActive: true },
      include: { lecturer: true }
    });
  }

  async findById(id: string) {
    return await this.prisma.class.findUnique({
      where: { id },
      include: { lecturer: true }
    });
  }
}

// File sessions.service.ts - lại phải viết caching thủ công
@Injectable()
export class SessionsService {
  private sessionCache = new Map<string, { data: any; expires: number }>();
  private readonly CACHE_TTL = 300000; // 5 phút

  async findAll() {
    const cacheKey = 'all_sessions';
    const cached = this.sessionCache.get(cacheKey);
    
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    const sessions = await this.prisma.session.findMany({
      where: { isActive: true },
      include: { class: true }
    });
    
    this.sessionCache.set(cacheKey, {
      data: sessions,
      expires: Date.now() + this.CACHE_TTL
    });
    
    return sessions;
  }

  // Code trùng lặp với ClassesService!
}

// File users.service.ts - lại phải viết caching!
@Injectable()
export class UsersService {
  private userCache = new Map<string, { data: any; expires: number }>();
  // Lại lặp lại code caching...
}
```

---

## 4. Code Mới (Sử dụng Decorator)

**File:** `src/common/decorators/cache-decorator.ts`

```typescript
import { Injectable } from '@nestjs/common';

// ============ In-Memory Cache Store ============
@Injectable()
export class InMemoryCacheStore {
  private cache = new Map<string, { value: any; expires: number }>();

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  set(key: string, value: any, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttlSeconds * 1000
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  size(): number {
    // Clean expired items first
    const now = Date.now();
    let count = 0;
    for (const [key, item] of this.cache) {
      if (item.expires > now) count++;
      else this.cache.delete(key);
    }
    return count;
  }
}

// ============ Cache Decorator ============
export function cached(ttlSeconds: number = 300, cacheKeyPrefix?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cacheStore = new InMemoryCacheStore();

    // Tạo cache key từ arguments
    const getCacheKey = (args: any[]) => {
      const prefix = cacheKeyPrefix || `${target.constructor.name}:${propertyKey}`;
      if (args.length === 0) return prefix;
      return `${prefix}:${JSON.stringify(args)}`;
    };

    descriptor.value = async function (...args: any[]) {
      const cacheKey = getCacheKey(args);

      // Check cache
      const cachedValue = cacheStore.get(cacheKey);
      if (cachedValue !== undefined) {
        return cachedValue;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Store in cache
      cacheStore.set(cacheKey, result, ttlSeconds);

      return result;
    };

    // Thêm method để clear cache
    descriptor.value.clearCache = function () {
      const cacheKey = getCacheKey(args);
      cacheStore.delete(cacheKey);
    };

    return descriptor;
  };
}

// ============ Cache Decorator với Instance ============
export function cachedWithStore(ttlSeconds: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const cacheStoreKey = Symbol(`cache_${propertyKey}`);

    descriptor.value = async function (...args: any[]) {
      // Get or create cache store cho instance
      let cacheStore = (this as any)[cacheStoreKey];
      if (!cacheStore) {
        cacheStore = new InMemoryCacheStore();
        (this as any)[cacheStoreKey] = cacheStore;
      }

      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`;
      const cachedValue = cacheStore.get(cacheKey);
      
      if (cachedValue !== undefined) {
        return cachedValue;
      }

      const result = await originalMethod.apply(this, args);
      cacheStore.set(cacheKey, result, ttlSeconds);

      return result;
    };

    return descriptor;
  };
}

// ============ Redis Cache Decorator (Optional) ============
export function redisCached(ttlSeconds: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const redis = (this as any).redis; // Assume redis is injected
      const cacheKey = `cache:${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

      // Try get from Redis
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Execute and store
      const result = await originalMethod.apply(this, args);
      await redis.setex(cacheKey, ttlSeconds, JSON.stringify(result));

      return result;
    };

    return descriptor;
  };
}
```

---

## 5. Cách sử dụng

```typescript
// Trong ClassesService
import { cached, InMemoryCacheStore } from '../decorators/cache-decorator';

@Injectable()
export class ClassesService {
  private cacheStore = new InMemoryCacheStore();

  @cached(300) // Cache 5 phút
  async findAll() {
    return await this.prisma.class.findMany({
      where: { isActive: true },
      include: { lecturer: true }
    });
  }

  @cached(60) // Cache 1 phút
  async findById(id: string) {
    return await this.prisma.class.findUnique({
      where: { id },
      include: { lecturer: true }
    });
  }

  // Method để clear cache khi có thay đổi
  @cached(300)
  async findAll() {
    return await this.prisma.class.findMany({ where: { isActive: true } });
  }

  async create(dto: CreateClassDto) {
    const result = await this.prisma.class.create({ data: dto });
    // Clear cache sau khi tạo mới
    this.clearCache();
    return result;
  }

  private clearCache() {
    this.cacheStore.clear();
  }
}

// Trong SessionsService
@Injectable()
export class SessionsService {
  @cached(300) // Cache 5 phút
  async findAll() {
    return await this.prisma.session.findMany({
      where: { isActive: true },
      include: { class: true }
    });
  }

  @cachedWithStore(600) // Cache riêng cho mỗi instance
  async getSessionsByDate(date: string) {
    return await this.prisma.session.findMany({
      where: { 
        startTime: { gte: new Date(date) }
      }
    });
  }
}
```

---

## 6. Giải thích tại sao áp dụng Decorator

### Vấn đề gặp phải:
- Code caching lặp lại trong nhiều service
- Không thể tái sử dụng logic caching
- Sửa một nơi ảnh hưởng nhiều nơi
- Vi phạm DRY (Don't Repeat Yourself)

### Giải pháp Decorator:
- Tạo decorator @cached() có thể tái sử dụng
- Áp dụng cho bất kỳ method nào
- Không sửa code gốc

---

## 7. Lợi ích của Decorator Pattern

| Tiêu chí | Trước khi dùng Decorator | Sau khi dùng Decorator |
|----------|-------------------------|----------------------|
| **Code trùng lặp** | Nhiều | Không có |
| **Tái sử dụng** | Không | Có (@cached) |
| **Sửa code gốc** | Cần | Không cần |
| **Thêm/bớt cache** | Sửa nhiều nơi | Thêm/xóa @cached |

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
    class ClassesService {
        +findAll()
        +findById(id)
        +create(dto)
    }
    
    class SessionsService {
        +findAll()
        +getSessionsByDate(date)
    }
    
    class <<decorator>> cached {
        +ttlSeconds: number
        +execute(target, propertyKey, descriptor)
    }
    
    class InMemoryCacheStore {
        +get(key): any
        +set(key, value, ttl)
        +delete(key)
        +clear()
    }
    
    cached --> InMemoryCacheStore
    cached ..> ClassesService
    cached ..> SessionsService
```

---

## 9. Kết luận

Decorator Pattern giúp thêm chức năng mà không sửa code gốc:

- ✅ Giảm code trùng lặp đáng kể
- ✅ Thêm/bớt caching dễ dàng
- ✅ Không sửa code gốc
- ✅ Tái sử dụng được

**Khuyến nghị:** Sử dụng Decorator khi cần thêm behavior (logging, caching, timing...) cho nhiều method mà không muốn sửa code gốc.

