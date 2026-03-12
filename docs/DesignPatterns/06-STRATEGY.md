# Strategy Pattern - Mẫu Thiết Kế Strategy

## 1. Giới thiệu Pattern

**Strategy** là mẫu thiết kế thuộc nhóm **Behavioral** (Hành vi), cho phép định nghĩa một tập hợp các thuật toán (algorithms), đóng gói từng thuật toán và làm cho chúng có thể thay thế cho nhau. Strategy cho phép thuật toán thay đổi độc lập với client sử dụng nó.

---

## 2. Bối cảnh áp dụng

Trong hệ thống QR Attendance, có nhiều cách để xác thực người dùng:
- **Local Auth** - Đăng nhập bằng email/password
- **JWT Auth** - Xác thực bằng JWT token
- **OAuth** - Đăng nhập bằng Google, Facebook
- **SSO** - Single Sign-On cho trường

Mỗi cách xác thực có logic khác nhau, cần một cơ chế để dễ dàng chuyển đổi giữa các cách này.

---

## 3. Code Cũ (Không dùng Strategy)

**File:** `src/auth/auth.service.ts`

```typescript
@Injectable()
export class AuthService {
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    // Generate JWT
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user
    };
  }

  // Xử lý JWT auth
  async validateToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      return user;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  // Xử lý OAuth (lồng trong cùng service - vi phạm SRP)
  async handleOAuthCallback(provider: string, profile: any) {
    let user = await this.prisma.user.findUnique({ 
      where: { email: profile.email } 
    });
    
    if (!user) {
      user = await this.prisma.user.create({
        data: { email: profile.email, role: 'STUDENT', isActive: true }
      });
    }
    
    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload), user };
  }
}
```

---

## 4. Code Mới (Sử dụng Strategy)

**File:** `src/auth/strategies/auth-strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';

// ============ Strategy Interface ============
export interface AuthStrategy {
  authenticate(credentials: any): Promise<User>;
  supports(credentials: any): boolean;
}

// ============ Local Strategy (Email/Password) ============
@Injectable()
export class LocalAuthStrategy implements AuthStrategy {
  constructor(
    private prisma: PrismaService,
    private bcrypt: any
  ) {}

  supports(credentials: any): boolean {
    return credentials.email && credentials.password;
  }

  async authenticate(credentials: { email: string; password: string }): Promise<User> {
    const user = await this.prisma.user.findUnique({ 
      where: { email: credentials.email } 
    });
    
    if (!user || !await this.bcrypt.compare(credentials.password, user.password)) {
      throw new UnauthorizedException('Invalid email or password');
    }
    
    return user;
  }
}

// ============ JWT Strategy ============
@Injectable()
export class JwtAuthStrategy implements AuthStrategy {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  supports(credentials: any): boolean {
    return credentials.token && !credentials.email;
  }

  async authenticate(credentials: { token: string }): Promise<User> {
    try {
      const payload = this.jwtService.verify(credentials.token);
      const user = await this.prisma.user.findUnique({ 
        where: { id: payload.sub } 
      });
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      
      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

// ============ OAuth Strategy ============
@Injectable()
export class OAuthStrategy implements AuthStrategy {
  constructor(private prisma: PrismaService) {}

  supports(credentials: any): boolean {
    return credentials.provider && credentials.profile;
  }

  async authenticate(credentials: { provider: string; profile: any }): Promise<User> {
    const { email, name, picture } = credentials.profile;
    
    let user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          role: 'STUDENT',
          isActive: true,
          oauthProvider: credentials.provider,
          profile: {
            create: {
              firstName: name?.givenName || '',
              lastName: name?.familyName || '',
              avatar: picture || ''
            }
          }
        }
      });
    }
    
    return user;
  }
}

// ============ Authenticator (Context) ============
@Injectable()
export class Authenticator {
  private strategies: AuthStrategy[] = [];

  constructor(
    private localStrategy: LocalAuthStrategy,
    private jwtStrategy: JwtAuthStrategy,
    private oauthStrategy: OAuthStrategy
  ) {
    // Đăng ký tất cả strategies
    this.strategies.push(localStrategy, jwtStrategy, oauthStrategy);
  }

  addStrategy(strategy: AuthStrategy): void {
    this.strategies.push(strategy);
  }

  async authenticate(credentials: any): Promise<User> {
    for (const strategy of this.strategies) {
      if (strategy.supports(credentials)) {
        return await strategy.authenticate(credentials);
      }
    }
    
    throw new UnauthorizedException('No suitable authentication strategy found');
  }

  // Login với nhiều cách
  async login(credentials: any) {
    const user = await this.authenticate(credentials);
    const payload = { sub: user.id, email: user.email, role: user.role };
    
    return {
      access_token: this.jwtService.sign(payload),
      user
    };
  }
}
```

---

## 5. Cách sử dụng

```typescript
// Trong AuthController
import { Authenticator } from './strategies/auth-strategy';

@Controller('auth')
export class AuthController {
  constructor(private authenticator: Authenticator) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    // Local auth - email/password
    return await this.authenticator.login({
      email: dto.email,
      password: dto.password
    });
  }

  @Post('oauth/google')
  async oauthGoogle(@Body() body: { token: string }) {
    // OAuth - chỉ cần token từ Google
    const profile = await this.getGoogleProfile(body.token);
    return await this.authenticator.authenticate({
      provider: 'google',
      profile
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req) {
    // JWT auth - token từ header
    return await this.authenticator.authenticate({
      token: req.headers.authorization?.replace('Bearer ', '')
    });
  }
}
```

---

## 6. Giải thích tại sao áp dụng Strategy

### Vấn đề gặp phải:
- AuthService chịu trách nhiệm quá nhiều loại xác thực
- Khó thêm cách xác thực mới
- Khó test từng loại xác thực
- Vi phạm Single Responsibility Principle

### Giải pháp Strategy:
- Tách mỗi loại xác thực thành Strategy riêng
- Authenticator chỉ quản lý việc chọn strategy phù hợp
- Thêm cách xác thực mới không cần sửa code cũ

---

## 7. Lợi ích của Strategy Pattern

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

## 8. Sơ đồ Class

```mermaid
classDiagram
    class Authenticator {
        -strategies: AuthStrategy[]
        +addStrategy(strategy)
        +authenticate(credentials): User
        +login(credentials)
    }
    
    class <<interface>> AuthStrategy {
        +supports(credentials): boolean
        +authenticate(credentials): User
    }
    
    Authenticator --> AuthStrategy
    
    AuthStrategy <|.. LocalAuthStrategy
    AuthStrategy <|.. JwtAuthStrategy
    AuthStrategy <|.. OAuthStrategy
    
    class LocalAuthStrategy {
        +supports(credentials): boolean
        +authenticate(credentials): User
    }
    
    class JwtAuthStrategy {
        +supports(credentials): boolean
        +authenticate(credentials): User
    }
    
    class OAuthStrategy {
        +supports(credentials): boolean
        +authenticate(credentials): User
    }
```

---

## 9. Kết luận

Strategy Pattern giúp quản lý nhiều thuật toán/xác thực khác nhau:

- ✅ Tách biệt rõ ràng từng loại xác thực
- ✅ Dễ dàng thêm xác thực mới (Google, Facebook, SSO...)
- ✅ Code gọn gàng, dễ bảo trì
- ✅ Dễ test từng thành phần

**Khuyến nghị:** Sử dụng Strategy khi hệ thống có nhiều cách thực hiện một tác vụ và cần dễ dàng chuyển đổi giữa chúng.

