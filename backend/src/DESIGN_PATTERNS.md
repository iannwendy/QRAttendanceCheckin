# Design Patterns trong Hệ thống QR Attendance

Dưới đây là 9 Design Patterns được áp dụng trong codebase, mỗi pattern được phân tích theo:
- **Bối cảnh áp dụng**: Lý do tự nhiên để áp dụng
- **Vị trí**: File được tạo
- **Lợi ích**: Đem lại giá trị gì

---

## 1. ADAPTER PATTERN (Structural)
**File**: `backend/src/common/utils/qr-token-adapter.ts`

**Bối cảnh**: Hệ thống QR Attendance hỗ trợ nhiều định dạng QR token:
- JWT token (đã sign)
- JSON string (sessionId + nonce)
- Raw JWT payload (decode không verify)

**Giải pháp**: Adapter pattern chuẩn hóa tất cả các định dạng này thành interface `QRTokenPayload` thống nhất. Mỗi adapter xử lý một loại format riêng biệt.

**Lợi ích**:
- Dễ dàng thêm định dạng mới mà không ảnh hưởng code hiện tại
- Tách biệt logic xử lý từng loại token
- Dễ test từng adapter riêng biệt

---

## 2. SINGLETON PATTERN (Creational)
**File**: `backend/src/common/config/config-manager.ts`

**Bối cảnh**: Hệ thống có nhiều nơi cần truy cập cấu hình chung (JWT_SECRET, QR_ROTATE_SECONDS, GEOFENCE_RADIUS_DEFAULT, etc.)

**Giải pháp**: ConfigManager đảm bảo chỉ có một instance duy nhất trong ứng dụng, có thể truy cập ở bất kỳ đâu mà không cần inject nhiều lần.

**Lợi ích**:
- Đảm bảo consistency của cấu hình
- Giảm memory overhead
- Dễ dàng truy cập global config

---

## 3. FACTORY PATTERN (Creational)
**File**: `backend/src/attendance/factories/attendance-response.factory.ts`

**Bối cảnh**: Hệ thống có nhiều loại attendance response (APPROVED, PENDING, REJECTED, TOO_FAR, NOT_ATTENDED), mỗi loại cần format response khác nhau.

**Giải pháp**: Factory tạo ra response object phù hợp với từng status, sử dụng các Builder nhỏ cho từng loại.

**Lợích**:
- Tập trung logic tạo response ở một nơi
- Dễ thêm response type mới
- Đảm bảo tính nhất quán của response format

---

## 4. BUILDER PATTERN (Creational)
**File**: `backend/src/sessions/builders/session.builder.ts`

**Bối cảnh**: Việc tạo Session có nhiều bước phức tạp:
1. Validate thông tin
2. Generate OTP secret
3. Kiểm tra mã trùng lặp
4. Tạo session trong DB
5. Auto-import sinh viên
6. Tạo attendance placeholders

**Giải pháp**: Builder tách rời việc xây dựng đối tượng phức tạp thành từng bước nhỏ, Director quản lý quy trình.

**Lợi ích**:
- Code gọn gàng, dễ đọc
- Tách biệt logic validation và creation
- Tái sử dụng được cho các trường hợp tạo session khác nhau

---

## 5. PROTOTYPE PATTERN (Creational)
**File**: `backend/src/users/prototypes/user.prototype.ts`

**Bối cảnh**: Hệ thống cần tạo 100 sinh viên mẫu (523H0001-523H0100) với các thuộc tính tương tự nhau nhưng khác studentCode.

**Giải pháp**: Tạo một prototype user với giá trị mặc định, sau đó clone và customize cho từng sinh viên.

**Lợi ích**:
- Tránh khởi tạo object mới cho mỗi sinh viên
- Performance tốt hơn khi tạo hàng loạt
- Dễ dàng thay đổi template

---

## 6. FACADE PATTERN (Structural)
**File**: `backend/src/attendance/facades/attendance-checkin.facade.ts`

**Bối cảnh**: Quy trình check-in QR có nhiều bước phức tạp (verify token → validate session → check enrollment → calculate GPS → create/update record).

**Giải pháp**: Facade cung cấp interface đơn giản `processCheckIn()` cho client, ẩn đi tất cả logic phức tạp bên trong.

**Lợi ích**:
- Đơn giản hóa API cho client
- Giảm coupling giữa client và subsystem
- Dễ bảo trì và thay đổi logic bên trong

---

## 7. STRATEGY PATTERN (Behavioral)
**File**: `backend/src/auth/strategies/auth-strategy.ts`

**Bối cảnh**: Hệ thống hỗ trợ nhiều cách đăng nhập:
- ADMIN: đăng nhập admin
- LECTURER: đăng nhập giảng viên
- STUDENT: đăng nhập bằng MSSV

**Giải pháp**: Mỗi loại đăng nhập là một Strategy riêng biệt, Context quản lý và chọn strategy phù hợp.

**Lợi ích**:
- Dễ dàng thêm loại auth mới (ví dụ: SSO, OAuth)
- Tách biệt logic của từng loại authentication
- Dễ test từng strategy riêng biệt

---

## 8. OBSERVER PATTERN (Behavioral)
**File**: `backend/src/attendance/observers/attendance-observer.ts`

**Bối cảnh**: Khi attendance status thay đổi, cần thông báo cho nhiều thành phần:
- Logging service
- Analytics service
- Notification service

**Giải pháp**: AttendanceSubject quản lý danh sách observers, tự động notify khi có thay đổi status.

**Lợi ích**:
- Loose coupling giữa subject và observers
- Dễ dàng thêm observer mới
- Tự động notify tất cả interested parties

---

## 9. DECORATOR PATTERN (Structural)
**File**: `backend/src/common/decorators/cache-decorator.ts`

**Bối cảnh**: Một số service cần caching để tăng performance (Classes, Attendance Reports).

**Giải pháp**: Decorator `@cached()` thêm caching vào service methods mà không thay đổi code gốc.

**Lợi ích**:
- Tuân theo Open/Closed Principle
- Thêm chức năng mà không sửa code hiện có
- Có thể áp dụng cho bất kỳ method nào

---

## Tổng kết

| Pattern | Loại | Mục đích |
|---------|------|----------|
| Adapter | Structural | Chuẩn hóa đa dạng QR token format |
| Singleton | Creational | Quản lý global configuration |
| Factory | Creational | Tạo attendance response theo status |
| Builder | Creational | Xây dựng session với nhiều bước |
| Prototype | Creational | Clone user cho batch creation |
| Facade | Structural | Đơn giản hóa check-in process |
| Strategy | Behavioral | Linh hoạt authentication methods |
| Observer | Behavioral | Thông báo khi attendance thay đổi |
| Decorator | Structural | Thêm caching không sửa code gốc |

