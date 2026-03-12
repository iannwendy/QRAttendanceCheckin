# Design Patterns Documentation

Tài liệu hướng dẫn về 9 Design Patterns đã áp dụng trong hệ thống QR Attendance.

## Tổng quan

| # | Pattern | File | Nhóm | Mô tả ngắn |
|---|---------|------|------|-------------|
| 1 | **Facade** | [01-FACADE.md](01-FACADE.md) | Structural | Đơn giản hóa giao diện hệ thống phức tạp |
| 2 | **Factory** | [02-FACTORY.md](02-FACTORY.md) | Creational | Tạo đối tượng theo loại |
| 3 | **Observer** | [03-OBSERVER.md](03-OBSERVER.md) | Behavioral | Thông báo khi có thay đổi |
| 4 | **Builder** | [04-BUILDER.md](04-BUILDER.md) | Creational | Xây dựng đối tượng phức tạp từng bước |
| 5 | **Prototype** | [05-PROTOTYPE.md](05-PROTOTYPE.md) | Creational | Clone đối tượng mẫu |
| 6 | **Strategy** | [06-STRATEGY.md](06-STRATEGY.md) | Behavioral | Thay thế thuật toán linh hoạt |
| 7 | **Singleton** | [07-SINGLETON.md](07-SINGLETON.md) | Creational | Một instance duy nhất |
| 8 | **Adapter** | [08-ADAPTER.md](08-ADAPTER.md) | Structural | Chuyển đổi interface không tương thích |
| 9 | **Decorator** | [09-DECORATOR.md](09-DECORATOR.md) | Structural | Thêm behavior động |

---

## Nhóm Pattern

### Creational (4 patterns)
- **Factory** - Tạo đối tượng theo loại
- **Builder** - Xây dựng đối tượng phức tạp
- **Prototype** - Clone đối tượng mẫu
- **Singleton** - Một instance duy nhất

### Structural (3 patterns)
- **Facade** - Đơn giản hóa giao diện
- **Adapter** - Chuyển đổi interface
- **Decorator** - Thêm behavior động

### Behavioral (2 patterns)
- **Observer** - Thông báo khi có thay đổi
- **Strategy** - Thay thế thuật toán

---

## File Code Áp Dụng

| Pattern | File Code Mới |
|---------|---------------|
| Facade | `src/attendance/facades/attendance-checkin.facade.ts` |
| Factory | `src/attendance/factories/attendance-response.factory.ts` |
| Observer | `src/attendance/observers/attendance-observer.ts` |
| Builder | `src/sessions/builders/session.builder.ts` |
| Prototype | `src/users/prototypes/user.prototype.ts` |
| Strategy | `src/auth/strategies/auth-strategy.ts` |
| Singleton | `src/common/config/config-manager.ts` |
| Adapter | `src/common/utils/qr-token-adapter.ts` |
| Decorator | `src/common/decorators/cache-decorator.ts` |

---

## Xem chi tiết

- [01-FACADE.md](01-FACADE.md) - Facade Pattern
- [02-FACTORY.md](02-FACTORY.md) - Factory Pattern
- [03-OBSERVER.md](03-OBSERVER.md) - Observer Pattern
- [04-BUILDER.md](04-BUILDER.md) - Builder Pattern
- [05-PROTOTYPE.md](05-PROTOTYPE.md) - Prototype Pattern
- [06-STRATEGY.md](06-STRATEGY.md) - Strategy Pattern
- [07-SINGLETON.md](07-SINGLETON.md) - Singleton Pattern
- [08-ADAPTER.md](08-ADAPTER.md) - Adapter Pattern
- [09-DECORATOR.md](09-DECORATOR.md) - Decorator Pattern

