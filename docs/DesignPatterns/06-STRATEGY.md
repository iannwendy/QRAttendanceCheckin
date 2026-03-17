# Strategy Pattern - Mẫu Thiết Kế Strategy

## 1. Giới thiệu Pattern

**Strategy** là mẫu thiết kế thuộc nhóm **Behavioral** (Hành vi), cho phép định nghĩa một tập hợp các thuật toán (algorithms), đóng gói từng thuật toán và làm cho chúng có thể thay thế cho nhau. Strategy cho phép thuật toán thay đổi độc lập với client sử dụng nó.

---

## 2. Bối cảnh áp dụng

Trong hệ thống QR Attendance, có nhiều loại người dùng đăng nhập:
- **ADMIN** - Đăng nhập bằng username `admin`
- **LECTURER** - Đăng nhập bằng username `lecturer`
- **STUDENT** - Đăng nhập bằng MSSV (ví dụ: `523H0001`)

Mỗi loại có logic xác thực khác nhau, cần một cơ chế để dễ dàng chuyển đổi giữa các cách này.

---

## 3. Code Cũ (Không dùng Strategy)

**File:** `src/auth/auth.service.ts`

```typescript
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    if (password !== 'pass123') {
      throw new UnauthorizedException('Sai mật khẩu');
    }

    let user = null as any;
    const lower = (username || '').trim().toLowerCase();

    // Logic if/else lồng nhau cho từng loại user
    if (lower === 'admin') {
      user = await this.usersService.findByRole('ADMIN');
    } else if (lower === 'lecturer') {
      user = await this.usersService.findByRole('LECTURER');
    } else {
      // Assume MSSV
      const code = username.trim().toUpperCase();
      user = await this.usersService.findByStudentCode(code);
    }

    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        studentCode: user.studentCode,
        role: user.role,
      },
    };
  }
}
```

---

## 4. Code Mới (Sử dụng Strategy)

**File:** `src/auth/strategies/auth-strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';

export interface AuthResult {
  user: any;
  userType: 'ADMIN' | 'LECTURER' | 'STUDENT';
}

/**
 * Interface cho các Authentication Strategy
 */
export interface AuthStrategy {
  getName(): string;
  canHandle(username: string): boolean;
  authenticate(username: string): Promise<AuthResult>;
}

/**
 * Admin Authentication Strategy
 */
@Injectable()
export class AdminAuthStrategy implements AuthStrategy {
  constructor(private usersService: UsersService) {}

  getName(): string { return 'AdminAuthStrategy'; }

  canHandle(username: string): boolean {
    return username.trim().toLowerCase() === 'admin';
  }

  async authenticate(username: string): Promise<AuthResult> {
    const user = await this.usersService.findByRole('ADMIN');
    if (!user) {
      throw new UnauthorizedException('Tài khoản admin không tồn tại');
    }
    return { user, userType: 'ADMIN' };
  }
}

/**
 * Lecturer Authentication Strategy
 */
@Injectable()
export class LecturerAuthStrategy implements AuthStrategy {
  constructor(private usersService: UsersService) {}

  getName(): string { return 'LecturerAuthStrategy'; }

  canHandle(username: string): boolean {
    return username.trim().toLowerCase() === 'lecturer';
  }

  async authenticate(username: string): Promise<AuthResult> {
    const user = await this.usersService.findByRole('LECTURER');
    if (!user) {
      throw new UnauthorizedException('Tài khoản giảng viên không tồn tại');
    }
    return { user, userType: 'LECTURER' };
  }
}

/**
 * Student Authentication Strategy (by MSSV)
 */
@Injectable()
export class StudentAuthStrategy implements AuthStrategy {
  constructor(private usersService: UsersService) {}

  getName(): string { return 'StudentAuthStrategy'; }

  canHandle(username: string): boolean {
    const trimmed = username.trim().toUpperCase();
    return /^523H\d{4}$/.test(trimmed);
  }

  async authenticate(username: string): Promise<AuthResult> {
    const studentCode = username.trim().toUpperCase();
    const user = await this.usersService.findByStudentCode(studentCode);
    if (!user) {
      throw new UnauthorizedException('Sinh viên không tồn tại');
    }
    return { user, userType: 'STUDENT' };
  }
}

/**
 * Authentication Context - Quản lý các strategy
 */
@Injectable()
export class AuthStrategyContext {
  private strategies: AuthStrategy[] = [];

  constructor(
    adminStrategy: AdminAuthStrategy,
    lecturerStrategy: LecturerAuthStrategy,
    studentStrategy: StudentAuthStrategy,
  ) {
    // Thứ tự ưu tiên: Admin -> Lecturer -> Student
    this.strategies = [adminStrategy, lecturerStrategy, studentStrategy];
  }

  addStrategy(strategy: AuthStrategy): void {
    this.strategies.push(strategy);
  }

  async authenticate(username: string): Promise<AuthResult> {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(username)) {
        return strategy.authenticate(username);
      }
    }

    // Fallback: thử là MSSV
    const studentStrategy = this.strategies.find(s => s instanceof StudentAuthStrategy);
    if (studentStrategy) {
      return studentStrategy.authenticate(username);
    }

    throw new UnauthorizedException('Không tìm thấy strategy phù hợp');
  }
}
```

**Cách sử dụng trong AuthService:**

```typescript
import { AuthStrategyContext, AuthResult } from './strategies/auth-strategy';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private authStrategyContext: AuthStrategyContext,
  ) {}

  async login(username: string, password: string) {
    if (password !== 'pass123') {
      throw new UnauthorizedException('Sai mật khẩu');
    }

    // Use Strategy Pattern to authenticate
    let authResult: AuthResult;
    try {
      authResult = await this.authStrategyContext.authenticate(username);
    } catch (error) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    if (!authResult || !authResult.user) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    const { user, userType } = authResult;

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        studentCode: user.studentCode,
        role: user.role,
      },
    };
  }
}
```

---

## 5. Giải thích tại sao áp dụng Strategy

### Vấn đề gặp phải:
- AuthService chịu trách nhiệm quá nhiều loại xác thực
- Khó thêm cách xác thực mới
- Khó test từng loại xác thực
- Vi phạm Single Responsibility Principle

### Giải pháp Strategy:
- Tách mỗi loại xác thực thành Strategy riêng
- AuthStrategyContext chỉ quản lý việc chọn strategy phù hợp
- Thêm cách xác thực mới không cần sửa code cũ

---

## 6. Lợi ích của Strategy Pattern

| Tiêu chí | Trước khi dùng Strategy | Sau khi dùng Strategy |
|----------|----------------------|---------------------|
| **SRP** | Vi phạm - 1 service làm nhiều việc | Tuân thủ - mỗi strategy 1 việc |
| **Thêm auth mới** | Sửa AuthService | Thêm Strategy mới |
| **Test** | Khó test | Dễ test từng strategy |
| **Coupling** | Cao | Thấp |

### Các lợi ích cụ thể:

1. **Open/Closed Principle**
   - Thêm strategy mới không sửa code cũ

2. **Dễ test**
   - Test từng strategy độc lập

3. **Dễ bảo trì**
   - Mỗi strategy có file riêng

4. **Runtime switching**
   - Có thể thay đổi strategy lúc chạy

---

## 7. Sơ đồ Class

```mermaid
classDiagram
    class AuthController {
        +login()
    }

    class AuthService {
        -authStrategyContext: AuthStrategyContext
        -jwtService: JwtService
        +login(username, password)
    }

    class AuthStrategyContext {
        -strategies: AuthStrategy[]
        +addStrategy(strategy)
        +authenticate(username): AuthResult
    }

    class <<interface>> AuthStrategy {
        +getName(): string
        +canHandle(username): boolean
        +authenticate(username): AuthResult
    }

    AuthController --> AuthService
    AuthService --> AuthStrategyContext
    AuthStrategyContext --> AuthStrategy

    AuthStrategy <|.. AdminAuthStrategy
    AuthStrategy <|.. LecturerAuthStrategy
    AuthStrategy <|.. StudentAuthStrategy

    class AdminAuthStrategy {
        -usersService: UsersService
        +getName(): string
        +canHandle(username): boolean
        +authenticate(username): AuthResult
    }

    class LecturerAuthStrategy {
        -usersService: UsersService
        +getName(): string
        +canHandle(username): boolean
        +authenticate(username): AuthResult
    }

    class StudentAuthStrategy {
        -usersService: UsersService
        +getName(): string
        +canHandle(username): boolean
        +authenticate(username): AuthResult
    }
```

---

## 8. Kết luận

Strategy Pattern giúp quản lý nhiều thuật toán/xác thực khác nhau:

- ✅ Tách biệt rõ ràng từng loại xác thực
- ✅ Dễ dàng thêm xác thực mới (Google, Facebook, SSO...)
- ✅ Code gọn gàng, dễ bảo trì
- ✅ Dễ test từng thành phần

**Khuyến nghị:** Sử dụng Strategy khi hệ thống có nhiều cách thực hiện một tác vụ và cần dễ dàng chuyển đổi giữa chúng.

