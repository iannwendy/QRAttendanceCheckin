# Adapter Pattern - Mẫu Thiết Kế Adapter

## 1. Giới thiệu Pattern

**Adapter** là mẫu thiết kế thuộc nhóm **Structural** (Cấu trúc), cho phép các interface không tương thích có thể làm việc cùng nhau. Adapter đóng gói interface của một class và cung cấp interface khác mà client mong đợi.

---

## 2. Bối cảnh áp dụng

Trong hệ thống QR Attendance, QR token có thể đến từ nhiều nguồn với định dạng khác nhau:
- **JWT Format** - Token được tạo bằng JWT (phổ biến)
- **JSON Format** - Token là JSON string
- **Simple Format** - Token đơn giản dạng `sessionId.userId.exp`
- **Legacy Format** - Định dạng cũ từ hệ thống cũ

Cần một cơ chế để xử lý tất cả các định dạng này một cách thống nhất.

---

## 3. Code Cũ (Không dùng Adapter)

**File:** `src/common/utils/qr-token.util.ts`

```typescript
import { jwt } from 'jsonwebtoken';

export interface QRTokenPayload {
  sessionId: string;
  userId?: string;
  exp?: number;
  iat?: number;
}

export function verifyQRToken(token: string): QRTokenPayload {
  // Cách 1: JWT format (phổ biến)
  // Token dạng: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  try {
    const secret = process.env.JWT_SECRET || 'default-secret';
    const decoded = jwt.verify(token, secret) as QRTokenPayload;
    return decoded;
  } catch (e) {
    // Continue to next format
  }

  // Cách 2: JSON format
  // Token dạng: {"sessionId":"abc123","userId":"user1"}
  try {
    const parsed = JSON.parse(token);
    if (parsed.sessionId) {
      return {
        sessionId: parsed.sessionId,
        userId: parsed.userId,
        exp: parsed.exp
      };
    }
  } catch (e) {
    // Continue to next format
  }

  // Cách 3: Simple format (legacy)
  // Token dạng: sessionId.userId.timestamp
  const parts = token.split('.');
  if (parts.length === 3) {
    const [sessionId, userId, exp] = parts;
    return {
      sessionId,
      userId,
      exp: parseInt(exp)
    };
  }

  // Cách 4: Legacy format từ hệ thống cũ
  // Token dạng: SESSIONID_TIMESTAMP
  const legacyMatch = token.match(/^([A-Z0-9]+)_(\d+)$/i);
  if (legacyMatch) {
    return {
      sessionId: legacyMatch[1],
      exp: parseInt(legacyMatch[2])
    };
  }

  throw new Error('Invalid QR token format');
}

export function generateQRToken(sessionId: string, userId?: string): string {
  // Hiện tại chỉ hỗ trợ JWT
  const secret = process.env.JWT_SECRET || 'default-secret';
  return jwt.sign({ sessionId, userId }, secret, { expiresIn: '1h' });
}
```

---

## 4. Code Mới (Sử dụng Adapter)

**File:** `src/common/utils/qr-token-adapter.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { jwt, JwtPayload } from 'jsonwebtoken';

// ============ QR Token Payload ============
export interface QRTokenPayload {
  sessionId: string;
  userId?: string;
  exp?: number;
  iat?: number;
}

// ============ Adapter Interface ============
export interface QRTokenAdapter {
  canHandle(token: string): boolean;
  parse(token: string): QRTokenPayload | null;
  generate(sessionId: string, userId?: string): string;
}

// ============ JWT Adapter ============
@Injectable()
export class JWTTokenAdapter implements QRTokenAdapter {
  private secret: string;

  constructor() {
    this.secret = process.env.JWT_SECRET || 'default-secret';
  }

  canHandle(token: string): boolean {
    // JWT có 3 phần ngăn cách bởi dấu chấm và không bắt đầu bởi {
    const parts = token.split('.');
    return parts.length === 3 && !token.trim().startsWith('{');
  }

  parse(token: string): QRTokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret) as JwtPayload;
      return {
        sessionId: decoded.sessionId || decoded.sub || '',
        userId: decoded.userId,
        exp: decoded.exp,
        iat: decoded.iat
      };
    } catch (error) {
      return null;
    }
  }

  generate(sessionId: string, userId?: string): string {
    return jwt.sign({ sessionId, userId }, this.secret, { expiresIn: '1h' });
  }
}

// ============ JSON Adapter ============
@Injectable()
export class JSONTokenAdapter implements QRTokenAdapter {
  canHandle(token: string): boolean {
    const trimmed = token.trim();
    return trimmed.startsWith('{') && trimmed.endsWith('}');
  }

  parse(token: string): QRTokenPayload | null {
    try {
      const parsed = JSON.parse(token);
      if (parsed.sessionId) {
        return {
          sessionId: parsed.sessionId,
          userId: parsed.userId,
          exp: parsed.exp
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  generate(sessionId: string, userId?: string): string {
    return JSON.stringify({
      sessionId,
      userId,
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    });
  }
}

// ============ Simple Format Adapter ============
@Injectable()
export class SimpleTokenAdapter implements QRTokenAdapter {
  canHandle(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && /^\d+$/.test(parts[2]);
  }

  parse(token: string): QRTokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        return {
          sessionId: parts[0],
          userId: parts[1],
          exp: parseInt(parts[2])
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  generate(sessionId: string, userId?: string): string {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    return `${sessionId}.${userId || ''}.${exp}`;
  }
}

// ============ Legacy Format Adapter ============
@Injectable()
export class LegacyTokenAdapter implements QRTokenAdapter {
  canHandle(token: string): boolean {
    // Legacy: SESSIONID_TIMESTAMP hoặc SESSIONID
    return /^[A-Z0-9]+(_(\d+))?$/i.test(token);
  }

  parse(token: string): QRTokenPayload | null {
    try {
      const match = token.match(/^([A-Z0-9]+)(?:_(\d+))?$/i);
      if (match) {
        return {
          sessionId: match[1],
          exp: match[2] ? parseInt(match[2]) : undefined
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  generate(sessionId: string, userId?: string): string {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    return `${sessionId}_${exp}`;
  }
}

// ============ Adapter Manager ============
@Injectable()
export class QRTokenAdapterManager {
  private adapters: QRTokenAdapter[] = [];

  constructor(
    private jwtAdapter: JWTTokenAdapter,
    private jsonAdapter: JSONTokenAdapter,
    private simpleAdapter: SimpleTokenAdapter,
    private legacyAdapter: LegacyTokenAdapter
  ) {
    // Đăng ký adapters theo thứ ưu tiên
    this.adapters = [
      jwtAdapter,
      jsonAdapter,
      simpleAdapter,
      legacyAdapter
    ];
  }

  addAdapter(adapter: QRTokenAdapter): void {
    this.adapters.push(adapter);
  }

  parse(token: string): QRTokenPayload {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(token)) {
        const result = adapter.parse(token);
        if (result) {
          return result;
        }
      }
    }
    throw new Error('Invalid QR token format - no adapter could parse');
  }

  generate(sessionId: string, userId?: string, format: string = 'jwt'): string {
    const adapter = this.adapters.find(a => 
      format === 'jwt' ? a instanceof JWTTokenAdapter :
      format === 'json' ? a instanceof JSONTokenAdapter :
      format === 'simple' ? a instanceof SimpleTokenAdapter :
      a instanceof LegacyTokenAdapter
    );
    
    if (!adapter) {
      throw new Error(`Unknown format: ${format}`);
    }
    
    return adapter.generate(sessionId, userId);
  }

  // Auto-detect format
  detectFormat(token: string): string {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(token) && adapter.parse(token)) {
        if (adapter instanceof JWTTokenAdapter) return 'jwt';
        if (adapter instanceof JSONTokenAdapter) return 'json';
        if (adapter instanceof SimpleTokenAdapter) return 'simple';
        if (adapter instanceof LegacyTokenAdapter) return 'legacy';
      }
    }
    return 'unknown';
  }
}
```

---

## 5. Cách sử dụng

```typescript
// Trong AttendanceService
import { QRTokenAdapterManager } from '../common/utils/qr-token-adapter';

@Injectable()
export class AttendanceService {
  constructor(
    private qrTokenAdapter: QRTokenAdapterManager,
    // các service khác
  ) {}

  async checkInQR(studentId: string, dto: CheckInQRDto) {
    // Parse QR token - tự động detect format
    const qrPayload = this.qrTokenAdapter.parse(dto.qrToken);
    
    // Kiểm tra hết hạn
    if (qrPayload.exp && qrPayload.exp < Math.floor(Date.now() / 1000)) {
      throw new BadRequestException('QR code đã hết hạn');
    }
    
    // Tiếp tục xử lý...
    const session = await this.sessionsService.findById(qrPayload.sessionId);
    // ...
  }

  // Generate QR với format cụ thể
  async generateQR(sessionId: string, userId?: string) {
    const jwtToken = this.qrTokenAdapter.generate(sessionId, userId, 'jwt');
    const jsonToken = this.qrTokenAdapter.generate(sessionId, userId, 'json');
    
    return { jwt: jwtToken, json: jsonToken };
  }
}
```

---

## 6. Giải thích tại sao áp dụng Adapter

### Vấn đề gặp phải:
- Một function xử lý quá nhiều định dạng
- Khó thêm định dạng mới
- Khó test từng định dạng
- Code dài và khó đọc

### Giải pháp Adapter:
- Mỗi adapter xử lý một định dạng
- Manager chọn adapter phù hợp
- Thêm format mới không cần sửa code cũ

---

## 7. Lợi ích của Adapter Pattern

| Tiêu chí | Trước khi dùng Adapter | Sau khi dùng Adapter |
|----------|----------------------|---------------------|
| **Số dòng code** | ~80 dòng trong 1 function | ~10 dòng mỗi adapter |
| **Thêm format** | Sửa function | Thêm Adapter mới |
| **Test** | Khó test | Dễ test từng adapter |
| **Đọc code** | Khó | Dễ dàng |

### Các lợi ích cụ thể:

1. **Single Responsibility**
   - Mỗi adapter lo một định dạng

2. **Open/Closed**
   - Thêm format không sửa code cũ

3. **Dễ test**
   - Test từng adapter độc lập

4. **Dễ mở rộng**
   - Thêm adapter mới dễ dàng

---

## 8. Sơ đồ Class

```mermaid
classDiagram
    class QRTokenAdapterManager {
        -adapters: QRTokenAdapter[]
        +addAdapter(adapter)
        +parse(token): QRTokenPayload
        +generate(sessionId, userId, format): string
        +detectFormat(token): string
    }
    
    class <<interface>> QRTokenAdapter {
        +canHandle(token): boolean
        +parse(token): QRTokenPayload
        +generate(sessionId, userId): string
    }
    
    QRTokenAdapterManager --> QRTokenAdapter
    
    QRTokenAdapter <|.. JWTTokenAdapter
    QRTokenAdapter <|.. JSONTokenAdapter
    QRTokenAdapter <|.. SimpleTokenAdapter
    QRTokenAdapter <|.. LegacyTokenAdapter
    
    class JWTTokenAdapter {
        +canHandle(token): boolean
        +parse(token): QRTokenPayload
        +generate(sessionId, userId): string
    }
    
    class JSONTokenAdapter {
        +canHandle(token): boolean
        +parse(token): QRTokenPayload
        +generate(sessionId, userId): string
    }
```

---

## 9. Kết luận

Adapter Pattern giúp xử lý nhiều định dạng khác nhau một cách thống nhất:

- ✅ Tách biệt rõ ràng từng loại adapter
- ✅ Dễ dàng thêm định dạng mới
- ✅ Code gọn gàng, dễ bảo trì
- ✅ Dễ test từng thành phần

**Khuyến nghị:** Sử dụng Adapter khi hệ thống cần xử lý nhiều định dạng đầu vào khác nhau.

