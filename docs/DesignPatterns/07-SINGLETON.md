# Singleton Pattern - Mẫu Thiết Kế Singleton

## 1. Giới thiệu Pattern

**Singleton** là mẫu thiết kế thuộc nhóm **Creational** (Khởi tạo), đảm bảo rằng một class chỉ có duy nhất một instance và cung cấp một điểm truy cập toàn cục đến instance đó. Pattern này đặc biệt hữu ích khi cần một đối tượng được chia sẻ trên toàn ứng dụng.

---

## 2. Bối cảnh áp dụng

Trong hệ thống QR Attendance, có nhiều cấu hình cần được quản lý tập trung:
- JWT_SECRET - Khóa ký JWT
- QR_ROTATE_SECONDS - Thời gian hiệu lực QR
- OTP_STEP_SECONDS - Thời gian step của OTP
- GEOFENCE_RADIUS_DEFAULT - Bán kính geofence mặc định

Mỗi service cần access các config này một cách nhất quán.

---

## 3. Code Cũ (Không dùng Singleton)

**File:** `src/sessions/sessions.service.ts`

```typescript
@Injectable()
export class SessionsService {
  constructor(
    private config: ConfigService,  // Inject nhiều lần
  ) {}

  async generateQRCode(sessionId: string) {
    const jwtSecret = this.config.get('JWT_SECRET');  // Lấy config
    const rotateSeconds = this.config.get('QR_ROTATE_SECONDS') || 60;
    // ... generate QR
  }
}

// File khác lại inject ConfigService
@Injectable()
export class AuthService {
  constructor(
    private config: ConfigService,  // Inject lại
  ) {}

  generateToken() {
    const jwtSecret = this.config.get('JWT_SECRET');  // Lặp lại
    // ...
  }
}
```

---

## 4. Code Mới (Sử dụng Singleton)

**File:** `src/common/config/config-manager.ts`

```typescript
import { Injectable, Global } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

export interface AppConfig {
  jwtSecret: string;
  qrRotateSeconds: number;
  otpStepSeconds: number;
  geofenceRadiusDefault: number;
  uploadPath: string;
  nodeEnv: 'development' | 'production';
}

/**
 * Singleton Config Manager
 * Đảm bảo chỉ có một instance duy nhất trong toàn ứng dụng
 * Sử dụng factory pattern của NestJS để đảm bảo singleton
 */
@Global()
@Injectable()
export class ConfigManager {
  private static instance: ConfigManager;
  private config: NestConfigService;

  constructor(config: NestConfigService) {
    if (ConfigManager.instance) {
      return ConfigManager.instance;
    }
    this.config = config;
    ConfigManager.instance = this;
  }

  static getInstance(config?: NestConfigService): ConfigManager {
    if (!ConfigManager.instance && config) {
      ConfigManager.instance = new ConfigManager(config);
    }
    return ConfigManager.instance;
  }

  getJwtSecret(): string {
    return this.config.get('JWT_SECRET') || 'dev_change_me';
  }

  getQrRotateSeconds(): number {
    return parseInt(this.config.get('QR_ROTATE_SECONDS') || '180') || 180;
  }

  getOtpStepSeconds(): number {
    return parseInt(this.config.get('OTP_STEP_SECONDS') || '30') || 30;
  }

  getGeofenceRadiusDefault(): number {
    return parseInt(this.config.get('GEOFENCE_RADIUS_DEFAULT') || '100') || 100;
  }

  getUploadPath(): string {
    return this.config.get('UPLOAD_PATH') || './uploads';
  }

  getNodeEnv(): 'development' | 'production' {
    return (this.config.get('NODE_ENV') as 'development' | 'production') || 'development';
  }

  getAll(): AppConfig {
    return {
      jwtSecret: this.getJwtSecret(),
      qrRotateSeconds: this.getQrRotateSeconds(),
      otpStepSeconds: this.getOtpStepSeconds(),
      geofenceRadiusDefault: this.getGeofenceRadiusDefault(),
      uploadPath: this.getUploadPath(),
      nodeEnv: this.getNodeEnv(),
    };
  }
}
```

---

## 5. Cách sử dụng

**File:** `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigManager } from './common/config/config-manager';

@Module({
  providers: [
    ConfigManager,
    // ... other providers
  ],
  exports: [ConfigManager],
})
export class AppModule {}
```

**Sử dụng trong service:**

```typescript
import { ConfigManager } from '../common/config/config-manager';

@Injectable()
export class SessionsService {
  constructor(
    private configManager: ConfigManager,  // Inject 1 lần
  ) {}

  async generateQRCode() {
    const jwtSecret = this.configManager.getJwtSecret();
    const rotateSeconds = this.configManager.getQrRotateSeconds();
    // ...
  }
}
```

---

## 6. Giải thích tại sao áp dụng Singleton

### Vấn đề gặp phải:
- ConfigService được inject vào mọi service
- Truy cập config không nhất quán
- Khó thay đổi cách đọc config

### Giải pháp Singleton:
- Một instance duy nhất cho toàn app
- API nhất quán để truy cập config
- Dễ dàng thay đổi cách đọc config

---

## 7. Lợi ích của Singleton Pattern

| Tiêu chí | Trước khi dùng Singleton | Sau khi dùng Singleton |
|----------|------------------------|----------------------|
| **Instance** | Nhiều (mỗi service) | Một (toàn app) |
| **API** | Không nhất quán | Nhất quán (typed methods) |
| **Maintenance** | Khó | Dễ |

### Các lợi ích cụ thể:

1. **Global Access**
   - Truy cập từ bất kỳ đâu

2. **Consistency**
   - Tất cả config qua một nơi

3. **Easy Changes**
   - Thay đổi cách đọc config ở 1 chỗ

4. **Type Safety**
   - Các method được typed, giảm lỗi

---

## 8. Sơ đồ Class

```mermaid
classDiagram
    class ConfigManager {
        -static instance: ConfigManager
        -config: NestConfigService
        -private constructor(config: NestConfigService)
        +static getInstance(config?: NestConfigService): ConfigManager
        +getJwtSecret(): string
        +getQrRotateSeconds(): number
        +getOtpStepSeconds(): number
        +getGeofenceRadiusDefault(): number
        +getUploadPath(): string
        +getNodeEnv(): string
        +getAll(): AppConfig
    }

    class AppConfig {
        +jwtSecret: string
        +qrRotateSeconds: number
        +otpStepSeconds: number
        +geofenceRadiusDefault: number
        +uploadPath: string
        +nodeEnv: string
    }

    ConfigManager ..> AppConfig : returns
    ConfigManager : "1" o-- "1" NestConfigService : wraps

    class SessionsService {
        -configManager: ConfigManager
    }

    class AuthService {
        -configManager: ConfigManager
    }

    class AttendanceService {
        -configManager: ConfigManager
    }

    SessionsService --> ConfigManager : uses
    AuthService --> ConfigManager : uses
    AttendanceService --> ConfigManager : uses
```

---

## 9. Kết luận

Singleton Pattern giúp quản lý config tập trung và hiệu quả:

- ✅ Một instance duy nhất cho toàn ứng dụng
- ✅ API nhất quán, dễ sử dụng
- ✅ Dễ dàng thay đổi cách đọc config
- ✅ Type safety với typed methods

**Khuyến nghị:** Sử dụng Singleton cho các đối tượng cần shared state hoặc config toàn cục.
