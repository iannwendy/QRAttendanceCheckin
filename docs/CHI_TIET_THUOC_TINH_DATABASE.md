# Chi Tiết Thuộc Tính Database - ERD

Tài liệu này giải thích chi tiết từng thuộc tính trong tất cả các bảng của hệ thống QR Attendance.

---

## 📋 BẢNG 1: USER

Bảng lưu thông tin người dùng (Sinh viên, Giảng viên, Admin).

### 1. `id` (String, Primary Key)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: `@id @default(cuid())`
- **Mục đích**: Định danh duy nhất cho mỗi user
- **Giá trị mặc định**: Tự động generate bằng CUID (Collision-resistant Unique Identifier)
- **Ví dụ**: `"clx123abc456def789ghi012jkl345"`
- **Đặc điểm**: 
  - CUID là chuỗi ngẫu nhiên, không thể đoán được
  - Không phải auto-increment number → bảo mật hơn
  - Được dùng làm foreign key trong các bảng khác
- **Vị trí code**: Tự động tạo bởi Prisma khi insert

### 2. `email` (String, Unique)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: `@unique` (không được trùng)
- **Mục đích**: Email đăng nhập, phải unique trong hệ thống
- **Ví dụ**: `"523h0001@example.edu"`, `"lecturer@university.edu"`
- **Đặc điểm**: 
  - Bắt buộc phải có (NOT NULL)
  - Dùng để đăng nhập và xác thực
  - Unique constraint đảm bảo không có 2 user cùng email
- **Vị trí code**: 
  - Validation: `backend/src/auth/dto/login.dto.ts`
  - Sử dụng: `backend/src/auth/auth.service.ts`

### 3. `passwordHash` (String)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: NOT NULL
- **Mục đích**: Lưu mật khẩu đã được hash (không lưu plain text)
- **Ví dụ**: `"$2b$10$abcdefghijklmnopqrstuvwxyz1234567890"`
- **Đặc điểm**: 
  - Bắt buộc phải có
  - Nên dùng bcrypt hoặc argon2 để hash
  - Không bao giờ trả về field này trong API response
- **Vị trí code**: 
  - Hash password: `backend/src/auth/auth.service.ts` (khi đăng ký/đổi mật khẩu)
  - Verify: `backend/src/auth/auth.service.ts` (khi login)

### 4. `fullName` (String)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: NOT NULL
- **Mục đích**: Họ và tên đầy đủ của user
- **Ví dụ**: `"Nguyễn Văn A"`, `"Trần Thị B"`
- **Đặc điểm**: 
  - Bắt buộc phải có
  - Hiển thị trong UI, báo cáo điểm danh
- **Vị trí code**: 
  - Tạo user: `backend/prisma/seed.ts`
  - Hiển thị: `frontend/src/pages/` (các trang hiển thị thông tin user)

### 5. `studentCode` (String?, Unique, Optional)
- **Kiểu dữ liệu**: `String?` (nullable - có thể NULL)
- **Ràng buộc**: `@unique` (nếu có giá trị thì phải unique)
- **Mục đích**: Mã số sinh viên (MSSV)
- **Ví dụ**: `"523H0001"`, `"523H0100"`, `null` (cho giảng viên/admin)
- **Đặc điểm**: 
  - **Optional**: Giảng viên và Admin có thể không có studentCode
  - **Unique**: Nếu có giá trị thì phải unique (không trùng)
  - Dùng để hiển thị trong watermark ảnh điểm danh
  - Dùng để tìm kiếm sinh viên
- **Vị trí code**: 
  - Tạo: `backend/src/sessions/sessions.service.ts` (auto-import 100 SV)
  - Sử dụng: `frontend/src/pages/StudentOTPPage.tsx` (watermark)

### 6. `role` (Role Enum, Default: STUDENT)
- **Kiểu dữ liệu**: `Role` (enum: STUDENT, LECTURER, ADMIN)
- **Ràng buộc**: `@default(STUDENT)`
- **Mục đích**: Phân quyền người dùng
- **Giá trị có thể**: 
  - `STUDENT`: Sinh viên (mặc định)
  - `LECTURER`: Giảng viên
  - `ADMIN`: Quản trị viên
- **Đặc điểm**: 
  - Mặc định là STUDENT nếu không chỉ định
  - Dùng để kiểm tra quyền truy cập API (Role-based access control)
- **Vị trí code**: 
  - Enum: `backend/prisma/schema.prisma` (dòng 100-104)
  - Guard: `backend/src/common/guards/roles.guard.ts`
  - Decorator: `backend/src/common/decorators/roles.decorator.ts`

### 7. `createdAt` (DateTime, Auto)
- **Kiểu dữ liệu**: `DateTime`
- **Ràng buộc**: `@default(now())` - tự động set thời gian hiện tại khi tạo
- **Mục đích**: Ghi lại thời điểm tạo user
- **Ví dụ**: `2024-01-15T10:30:45.123Z`
- **Đặc điểm**: 
  - Tự động set, không cần truyền vào
  - Dùng để audit, thống kê
- **Vị trí code**: Tự động bởi Prisma

### 8. `updatedAt` (DateTime, Auto)
- **Kiểu dữ liệu**: `DateTime`
- **Ràng buộc**: `@updatedAt` - tự động cập nhật mỗi khi record thay đổi
- **Mục đích**: Ghi lại thời điểm cập nhật user lần cuối
- **Ví dụ**: `2024-01-20T14:22:10.456Z`
- **Đặc điểm**: 
  - Tự động update mỗi khi có thay đổi
  - Dùng để track thay đổi
- **Vị trí code**: Tự động bởi Prisma

### 9. `enrollments` (Relation - Array)
- **Kiểu dữ liệu**: `Enrollment[]` (mảng các Enrollment)
- **Mục đích**: Quan hệ một-nhiều với bảng Enrollment (user thuộc nhiều lớp)
- **Đặc điểm**: Virtual field, không lưu trong database, dùng để query
- **Vị trí code**: 
  - Query: `backend/src/classes/classes.service.ts`
  - Sử dụng: `session.class.students` (query enrollments)

### 10. `attendances` (Relation - Array)
- **Kiểu dữ liệu**: `Attendance[]` (mảng các Attendance)
- **Mục đích**: Quan hệ một-nhiều với bảng Attendance (user có nhiều lần điểm danh)
- **Đặc điểm**: Virtual field, dùng để query tất cả điểm danh của user
- **Vị trí code**: 
  - Query: `backend/src/attendance/attendance.service.ts`
  - Báo cáo: `getClassAttendanceReport()`

### 11. `taughtClasses` (Relation - Array)
- **Kiểu dữ liệu**: `Class[]` (mảng các Class)
- **Mục đích**: Quan hệ một-nhiều với bảng Class (giảng viên dạy nhiều lớp)
- **Đặc điểm**: 
  - Chỉ có giá trị khi `role = LECTURER`
  - Relation name: `"LecturerClasses"`
- **Vị trí code**: 
  - Schema: `backend/prisma/schema.prisma` (dòng 22, 34)
  - Query: `backend/src/classes/classes.service.ts`

---

## 📋 BẢNG 2: CLASS

Bảng lưu thông tin lớp học.

### 1. `id` (String, Primary Key)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: `@id @default(cuid())`
- **Mục đích**: Định danh duy nhất cho mỗi lớp
- **Ví dụ**: `"clx789xyz123abc456def789"`
- **Đặc điểm**: Tương tự User.id

### 2. `code` (String, Unique)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: `@unique` (không được trùng)
- **Mục đích**: Mã lớp học (ví dụ: "SOA2024", "CS101")
- **Ví dụ**: `"SOA2024"`, `"CS101"`, `"MATH202"`
- **Đặc điểm**: 
  - Bắt buộc, unique
  - Dùng để hiển thị, tìm kiếm lớp
  - Thường là mã ngắn gọn, dễ nhớ
- **Vị trí code**: 
  - Tạo: `backend/src/classes/classes.service.ts`
  - Validation: `backend/src/classes/dto/create-class.dto.ts`

### 3. `name` (String)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: NOT NULL
- **Mục đích**: Tên đầy đủ của lớp học
- **Ví dụ**: `"Kiến trúc Hướng dịch vụ"`, `"Cơ sở dữ liệu"`
- **Đặc điểm**: 
  - Bắt buộc
  - Hiển thị trong UI, báo cáo
- **Vị trí code**: 
  - Tạo: `backend/src/classes/classes.service.ts`
  - Hiển thị: Frontend các trang quản lý lớp

### 4. `createdAt` (DateTime, Auto)
- **Kiểu dữ liệu**: `DateTime`
- **Ràng buộc**: `@default(now())`
- **Mục đích**: Thời điểm tạo lớp
- **Đặc điểm**: Tương tự User.createdAt

### 5. `lecturerId` (String?, Optional, Foreign Key)
- **Kiểu dữ liệu**: `String?` (nullable)
- **Ràng buộc**: Foreign key → `User.id`, `onDelete: SetNull`
- **Mục đích**: ID của giảng viên phụ trách lớp
- **Ví dụ**: `"clx123abc456"` hoặc `null` (chưa gán giảng viên)
- **Đặc điểm**: 
  - **Optional**: Lớp có thể chưa có giảng viên
  - **SetNull on delete**: Nếu xóa giảng viên, `lecturerId` = null (không xóa lớp)
  - Có index để query nhanh
- **Vị trí code**: 
  - Schema: `backend/prisma/schema.prisma` (dòng 30, 34, 36)
  - Query: `backend/src/classes/classes.service.ts`

### 6. `sessions` (Relation - Array)
- **Kiểu dữ liệu**: `Session[]`
- **Mục đích**: Quan hệ một-nhiều (lớp có nhiều buổi học)
- **Đặc điểm**: Virtual field
- **Vị trí code**: 
  - Query: `backend/src/sessions/sessions.service.ts`
  - Báo cáo: `getClassAttendanceReport()`

### 7. `students` (Relation - Array)
- **Kiểu dữ liệu**: `Enrollment[]`
- **Mục đích**: Quan hệ một-nhiều với Enrollment (lớp có nhiều sinh viên)
- **Đặc điểm**: Virtual field, thông qua bảng trung gian Enrollment
- **Vị trí code**: 
  - Query: `backend/src/classes/classes.service.ts`
  - Auto-enroll: `backend/src/sessions/sessions.service.ts` (dòng 96-103)

### 8. `lecturer` (Relation - Optional)
- **Kiểu dữ liệu**: `User?` (nullable)
- **Mục đích**: Quan hệ nhiều-một với User (lớp thuộc về 1 giảng viên)
- **Đặc điểm**: 
  - Optional (có thể null)
  - Relation name: `"LecturerClasses"`
- **Vị trí code**: 
  - Query: `backend/src/classes/classes.service.ts`
  - Hiển thị: Frontend trang quản lý lớp

---

## 📋 BẢNG 3: ENROLLMENT

Bảng trung gian lưu mối quan hệ nhiều-nhiều giữa User và Class.

### 1. `id` (String, Primary Key)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: `@id @default(cuid())`
- **Mục đích**: Định danh duy nhất cho mỗi enrollment
- **Đặc điểm**: Tương tự các bảng khác

### 2. `classId` (String, Foreign Key)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: Foreign key → `Class.id`, `onDelete: Cascade`
- **Mục đích**: ID của lớp học
- **Ví dụ**: `"clx789xyz123"`
- **Đặc điểm**: 
  - Bắt buộc
  - **Cascade delete**: Xóa Class → tự động xóa tất cả Enrollment của lớp đó
- **Vị trí code**: 
  - Tạo: `backend/src/sessions/sessions.service.ts` (dòng 96-103)
  - Query: `backend/src/attendance/attendance.service.ts` (check enrollment)

### 3. `studentId` (String, Foreign Key)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: Foreign key → `User.id`, `onDelete: Cascade`
- **Mục đích**: ID của sinh viên
- **Ví dụ**: `"clx123abc456"`
- **Đặc điểm**: 
  - Bắt buộc
  - **Cascade delete**: Xóa User → tự động xóa tất cả Enrollment của user đó
- **Vị trí code**: Tương tự classId

### 4. `class` (Relation)
- **Kiểu dữ liệu**: `Class`
- **Mục đích**: Quan hệ nhiều-một với Class
- **Đặc điểm**: Virtual field, dùng để query thông tin lớp

### 5. `student` (Relation)
- **Kiểu dữ liệu**: `User`
- **Mục đích**: Quan hệ nhiều-một với User
- **Đặc điểm**: Virtual field, dùng để query thông tin sinh viên

### 6. `@@unique([classId, studentId])` (Composite Unique Constraint)
- **Mục đích**: Đảm bảo mỗi sinh viên chỉ đăng ký 1 lần cho mỗi lớp
- **Đặc điểm**: 
  - Ràng buộc ở cấp database
  - Ngăn chặn duplicate enrollment
  - Dùng để query: `findUnique({ where: { classId_studentId: {...} } })`
- **Vị trí code**: 
  - Schema: `backend/prisma/schema.prisma` (dòng 47)
  - Sử dụng: `backend/src/sessions/sessions.service.ts` (dòng 100, `skipDuplicates: true`)

---

## 📋 BẢNG 4: SESSION

Bảng lưu thông tin buổi học.

### 1. `id` (String, Primary Key)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: `@id @default(cuid())`
- **Mục đích**: Định danh duy nhất cho mỗi buổi học
- **Đặc điểm**: Tương tự các bảng khác

### 2. `classId` (String, Foreign Key)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: Foreign key → `Class.id`, `onDelete: Cascade`
- **Mục đích**: ID của lớp học chứa buổi này
- **Ví dụ**: `"clx789xyz123"`
- **Đặc điểm**: 
  - Bắt buộc
  - **Cascade delete**: Xóa Class → tự động xóa tất cả Session
  - Có index để query nhanh theo lớp
- **Vị trí code**: 
  - Schema: `backend/prisma/schema.prisma` (dòng 52, 63, 66)
  - Tạo: `backend/src/sessions/sessions.service.ts` (dòng 39-51)

### 3. `title` (String)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: NOT NULL
- **Mục đích**: Tiêu đề/tên buổi học
- **Ví dụ**: `"Buổi 1: Giới thiệu SOA"`, `"Lab 5: RESTful API"`
- **Đặc điểm**: 
  - Bắt buộc
  - Hiển thị trong UI, QR code metadata
- **Vị trí code**: 
  - Tạo: `backend/src/sessions/dto/create-session.dto.ts`
  - Hiển thị: Frontend, QR token payload

### 4. `startTime` (DateTime)
- **Kiểu dữ liệu**: `DateTime`
- **Ràng buộc**: NOT NULL
- **Mục đích**: Thời gian bắt đầu buổi học
- **Ví dụ**: `2024-01-15T08:00:00.000Z`
- **Đặc điểm**: 
  - Bắt buộc
  - Dùng để kiểm tra buổi học đang diễn ra (live sessions)
  - Format ISO 8601
- **Vị trí code**: 
  - Tạo: `backend/src/sessions/sessions.service.ts` (dòng 43)
  - Query live: `backend/src/attendance/attendance.service.ts` (dòng 556-560)

### 5. `endTime` (DateTime)
- **Kiểu dữ liệu**: `DateTime`
- **Ràng buộc**: NOT NULL
- **Mục đích**: Thời gian kết thúc buổi học
- **Ví dụ**: `2024-01-15T10:00:00.000Z`
- **Đặc điểm**: 
  - Bắt buộc
  - Phải > startTime
  - Dùng để kiểm tra buổi học đang diễn ra
- **Vị trí code**: Tương tự startTime

### 6. `latitude` (Float)
- **Kiểu dữ liệu**: `Float` (số thực)
- **Ràng buộc**: NOT NULL
- **Mục đích**: Vĩ độ GPS của địa điểm buổi học
- **Ví dụ**: `10.762622` (HCMUT)
- **Đặc điểm**: 
  - Bắt buộc
  - Dùng để kiểm tra GPS khi điểm danh QR
  - Range: -90 đến 90
- **Vị trí code**: 
  - Tạo: `backend/src/sessions/sessions.service.ts` (dòng 45)
  - Verify: `backend/src/attendance/attendance.service.ts` (dòng 119-124)

### 7. `longitude` (Float)
- **Kiểu dữ liệu**: `Float`
- **Ràng buộc**: NOT NULL
- **Mục đích**: Kinh độ GPS của địa điểm buổi học
- **Ví dụ**: `106.660172` (HCMUT)
- **Đặc điểm**: 
  - Bắt buộc
  - Range: -180 đến 180
- **Vị trí code**: Tương tự latitude

### 8. `geofenceRadius` (Int)
- **Kiểu dữ liệu**: `Int` (số nguyên)
- **Ràng buộc**: NOT NULL
- **Mục đích**: Bán kính geofence (mét) - khoảng cách tối đa cho phép điểm danh
- **Ví dụ**: `100` (100 mét), `50` (50 mét)
- **Đặc điểm**: 
  - Bắt buộc
  - Đơn vị: mét
  - Dùng để so sánh với khoảng cách Haversine
- **Vị trí code**: 
  - Tạo: `backend/src/sessions/sessions.service.ts` (dòng 47)
  - Verify: `backend/src/attendance/attendance.service.ts` (dòng 135)

### 9. `otpSecret` (String)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: NOT NULL
- **Mục đích**: Secret key để generate TOTP (Time-based OTP) cho buổi học
- **Ví dụ**: `"JBSWY3DPEHPK3PXP"` (Base32 encoded)
- **Đặc điểm**: 
  - Bắt buộc
  - Được generate tự động khi tạo session
  - Mỗi session có secret riêng
  - Dùng để generate và verify OTP
- **Vị trí code**: 
  - Generate: `backend/src/sessions/sessions.service.ts` (dòng 25)
  - Generate OTP: `backend/src/sessions/sessions.service.ts` (dòng 292)
  - Verify OTP: `backend/src/attendance/attendance.service.ts` (dòng 247)

### 10. `publicCode` (String?, Unique, Optional)
- **Kiểu dữ liệu**: `String?` (nullable)
- **Ràng buộc**: `@unique` (nếu có giá trị thì phải unique)
- **Mục đích**: Mã công khai ngắn gọn để sinh viên nhập khi điểm danh OTP
- **Ví dụ**: `"ABC123"`, `"LAB01"`, `null` (không bắt buộc nhưng nên có)
- **Đặc điểm**: 
  - **Optional**: Có thể null (nhưng trong code yêu cầu bắt buộc khi tạo)
  - **Unique**: Nếu có giá trị thì phải unique
  - Tối đa 6 ký tự (theo validation)
  - Được normalize (uppercase) khi lưu
- **Vị trí code**: 
  - Tạo: `backend/src/sessions/sessions.service.ts` (dòng 26-37)
  - Tìm kiếm: `backend/src/sessions/sessions.service.ts` (dòng 149-176)
  - Điểm danh: `backend/src/attendance/attendance.service.ts` (dòng 220-232)

### 11. `createdAt` (DateTime, Auto)
- **Kiểu dữ liệu**: `DateTime`
- **Ràng buộc**: `@default(now())`
- **Mục đích**: Thời điểm tạo buổi học
- **Đặc điểm**: Tương tự các bảng khác

### 12. `class` (Relation)
- **Kiểu dữ liệu**: `Class`
- **Mục đích**: Quan hệ nhiều-một với Class
- **Đặc điểm**: Virtual field

### 13. `attendances` (Relation - Array)
- **Kiểu dữ liệu**: `Attendance[]`
- **Mục đích**: Quan hệ một-nhiều (buổi học có nhiều điểm danh)
- **Đặc điểm**: Virtual field
- **Vị trí code**: 
  - Query: `backend/src/sessions/sessions.service.ts` (dòng 126-140)
  - Báo cáo: `getSessionAttendances()`

### 14. `@@index([classId])` (Index)
- **Mục đích**: Tạo index trên `classId` để query nhanh các session theo lớp
- **Đặc điểm**: 
  - Tăng tốc độ query: `WHERE classId = ...`
  - Tự động tạo bởi Prisma
- **Vị trí code**: Schema (dòng 66)

---

## 📋 BẢNG 5: ATTENDANCE

Bảng lưu thông tin điểm danh của sinh viên.

### 1. `id` (String, Primary Key)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: `@id @default(cuid())`
- **Mục đích**: Định danh duy nhất cho mỗi lần điểm danh
- **Đặc điểm**: Tương tự các bảng khác

### 2. `sessionId` (String, Foreign Key)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: Foreign key → `Session.id`, `onDelete: Cascade`
- **Mục đích**: ID của buổi học
- **Ví dụ**: `"clx456def789"`
- **Đặc điểm**: 
  - Bắt buộc
  - **Cascade delete**: Xóa Session → tự động xóa tất cả Attendance
  - Có index để query nhanh
- **Vị trí code**: 
  - Schema: `backend/prisma/schema.prisma` (dòng 71, 82, 87)
  - Tạo: `backend/src/attendance/attendance.service.ts` (dòng 184-194)

### 3. `studentId` (String, Foreign Key)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: Foreign key → `User.id`, `onDelete: Cascade`
- **Mục đích**: ID của sinh viên điểm danh
- **Ví dụ**: `"clx123abc456"`
- **Đặc điểm**: 
  - Bắt buộc
  - **Cascade delete**: Xóa User → tự động xóa tất cả Attendance
  - Có index để query nhanh
- **Vị trí code**: Tương tự sessionId

### 4. `method` (AttendanceMethod Enum)
- **Kiểu dữ liệu**: `AttendanceMethod` (enum)
- **Ràng buộc**: NOT NULL
- **Mục đích**: Phương thức điểm danh
- **Giá trị có thể**: 
  - `QR_GPS`: Điểm danh bằng QR code + GPS
  - `OTP_PHOTO`: Điểm danh bằng OTP + ảnh
  - `AUTO_IMPORT`: Tự động tạo khi tạo session (placeholder)
- **Đặc điểm**: 
  - Bắt buộc
  - Dùng để phân biệt cách điểm danh
  - `AUTO_IMPORT` chỉ là placeholder, status = NOT_ATTENDED
- **Vị trí code**: 
  - Enum: `backend/prisma/schema.prisma` (dòng 106-110)
  - Set khi check-in: `backend/src/attendance/attendance.service.ts` (dòng 174, 274, 284)

### 5. `status` (AttendanceStatus Enum, Default: NOT_ATTENDED)
- **Kiểu dữ liệu**: `AttendanceStatus` (enum)
- **Ràng buộc**: `@default(NOT_ATTENDED)`
- **Mục đích**: Trạng thái điểm danh
- **Giá trị có thể**: 
  - `NOT_ATTENDED`: Chưa điểm danh (mặc định)
  - `PENDING`: Đã điểm danh, chờ giảng viên duyệt (OTP_PHOTO)
  - `APPROVED`: Đã được duyệt/điểm danh thành công
  - `REJECTED`: Bị từ chối
  - `TOO_FAR`: Quét QR nhưng GPS quá xa
- **Đặc điểm**: 
  - Mặc định là NOT_ATTENDED
  - QR_GPS → APPROVED (tự động) hoặc TOO_FAR
  - OTP_PHOTO → PENDING (cần duyệt) → APPROVED/REJECTED
- **Vị trí code**: 
  - Enum: `backend/prisma/schema.prisma` (dòng 112-118)
  - Set status: `backend/src/attendance/attendance.service.ts` (dòng 145, 175, 275, 285)
  - Approve/Reject: `backend/src/attendance/attendance.service.ts` (dòng 329-345)

### 6. `lat` (Float?, Optional)
- **Kiểu dữ liệu**: `Float?` (nullable)
- **Ràng buộc**: Optional
- **Mục đích**: Vĩ độ GPS của sinh viên khi điểm danh
- **Ví dụ**: `10.762622` hoặc `null` (nếu điểm danh OTP)
- **Đặc điểm**: 
  - **Optional**: Chỉ có khi điểm danh QR_GPS
  - OTP_PHOTO không có GPS → null
  - Dùng để kiểm tra vị trí
- **Vị trí code**: 
  - Set khi QR check-in: `backend/src/attendance/attendance.service.ts` (dòng 176, 190)
  - DTO: `backend/src/attendance/dto/checkin-qr.dto.ts` (dòng 7-8)

### 7. `lng` (Float?, Optional)
- **Kiểu dữ liệu**: `Float?` (nullable)
- **Ràng buộc**: Optional
- **Mục đích**: Kinh độ GPS của sinh viên khi điểm danh
- **Ví dụ**: `106.660172` hoặc `null`
- **Đặc điểm**: Tương tự `lat`
- **Vị trí code**: Tương tự `lat`

### 8. `accuracy` (Float?, Optional)
- **Kiểu dữ liệu**: `Float?` (nullable)
- **Ràng buộc**: Optional
- **Mục đích**: Độ chính xác GPS (mét) - từ Geolocation API
- **Ví dụ**: `10.5` (10.5 mét), `null`
- **Đặc điểm**: 
  - **Optional**: Chỉ có khi điểm danh QR_GPS
  - Độ chính xác càng thấp càng tốt (10m tốt hơn 100m)
  - Có thể dùng để validate (nếu accuracy > 50m → cảnh báo)
- **Vị trí code**: 
  - Set khi QR check-in: `backend/src/attendance/attendance.service.ts` (dòng 178, 192)
  - DTO: `backend/src/attendance/dto/checkin-qr.dto.ts` (dòng 13-14)

### 9. `otpUsed` (String?, Optional)
- **Kiểu dữ liệu**: `String?` (nullable)
- **Ràng buộc**: Optional
- **Mục đích**: OTP đã sử dụng khi điểm danh (audit trail)
- **Ví dụ**: `"123456"` hoặc `null` (nếu điểm danh QR)
- **Đặc điểm**: 
  - **Optional**: Chỉ có khi điểm danh OTP_PHOTO
  - Lưu để kiểm tra sau (audit)
  - TOTP tự động expire nên không cần check reuse
- **Vị trí code**: 
  - Set khi OTP check-in: `backend/src/attendance/attendance.service.ts` (dòng 276, 286)
  - DTO: `backend/src/attendance/dto/checkin-otp.dto.ts` (dòng 10-11)

### 10. `createdAt` (DateTime, Auto)
- **Kiểu dữ liệu**: `DateTime`
- **Ràng buộc**: `@default(now())`
- **Mục đích**: Thời điểm tạo record điểm danh
- **Đặc điểm**: 
  - Tự động set khi tạo
  - Với AUTO_IMPORT, đây là thời điểm tạo session
  - Với check-in thực, đây là thời điểm điểm danh
- **Vị trí code**: Tự động bởi Prisma

### 11. `updatedAt` (DateTime, Auto)
- **Kiểu dữ liệu**: `DateTime`
- **Ràng buộc**: `@updatedAt`
- **Mục đích**: Thời điểm cập nhật record lần cuối
- **Đặc điểm**: 
  - Tự động update mỗi khi có thay đổi
  - Dùng để biết thời điểm điểm danh thực tế (nếu update từ NOT_ATTENDED)
- **Vị trí code**: Tự động bởi Prisma

### 12. `session` (Relation)
- **Kiểu dữ liệu**: `Session`
- **Mục đích**: Quan hệ nhiều-một với Session
- **Đặc điểm**: Virtual field

### 13. `student` (Relation)
- **Kiểu dữ liệu**: `User`
- **Mục đích**: Quan hệ nhiều-một với User
- **Đặc điểm**: Virtual field

### 14. `evidence` (Relation - Optional)
- **Kiểu dữ liệu**: `Evidence?` (nullable)
- **Mục đích**: Quan hệ một-một với Evidence (ảnh bằng chứng)
- **Đặc điểm**: 
  - **Optional**: Chỉ có khi điểm danh OTP_PHOTO
  - QR_GPS không có evidence
- **Vị trí code**: 
  - Tạo: `backend/src/attendance/attendance.service.ts` (dòng 292-298)
  - Query: `backend/src/sessions/sessions.service.ts` (dòng 136)

### 15. `@@unique([sessionId, studentId])` (Composite Unique Constraint)
- **Mục đích**: Đảm bảo mỗi sinh viên chỉ có 1 record điểm danh cho mỗi buổi
- **Đặc điểm**: 
  - Ràng buộc ở cấp database
  - Khi check-in lại → update record cũ thay vì tạo mới
  - Dùng để query: `findUnique({ where: { sessionId_studentId: {...} } })`
- **Vị trí code**: 
  - Schema: `backend/prisma/schema.prisma` (dòng 86)
  - Sử dụng: `backend/src/attendance/attendance.service.ts` (dòng 127-134, 254-261)

### 16. `@@index([sessionId])` (Index)
- **Mục đích**: Tạo index trên `sessionId` để query nhanh tất cả điểm danh của 1 buổi
- **Đặc điểm**: Tăng tốc độ query: `WHERE sessionId = ...`
- **Vị trí code**: Schema (dòng 87)

### 17. `@@index([studentId])` (Index)
- **Mục đích**: Tạo index trên `studentId` để query nhanh tất cả điểm danh của 1 sinh viên
- **Đặc điểm**: Tăng tốc độ query: `WHERE studentId = ...`
- **Vị trí code**: Schema (dòng 88)

---

## 📋 BẢNG 6: EVIDENCE

Bảng lưu ảnh bằng chứng điểm danh.

### 1. `id` (String, Primary Key)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: `@id @default(cuid())`
- **Mục đích**: Định danh duy nhất cho mỗi evidence
- **Đặc điểm**: Tương tự các bảng khác

### 2. `attendanceId` (String, Foreign Key, Unique)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: Foreign key → `Attendance.id`, `@unique`, `onDelete: Cascade`
- **Mục đích**: ID của attendance (mỗi attendance chỉ có tối đa 1 evidence)
- **Ví dụ**: `"clx789xyz123"`
- **Đặc điểm**: 
  - Bắt buộc
  - **Unique**: Đảm bảo 1-1 relationship với Attendance
  - **Cascade delete**: Xóa Attendance → tự động xóa Evidence
- **Vị trí code**: 
  - Schema: `backend/prisma/schema.prisma` (dòng 93, 97)
  - Tạo: `backend/src/attendance/attendance.service.ts` (dòng 294)

### 3. `photoUrl` (String)
- **Kiểu dữ liệu**: `String`
- **Ràng buộc**: NOT NULL
- **Mục đích**: URL/path đến file ảnh
- **Ví dụ**: `"/uploads/7d5aac68a5aa1e1feafcffa7ecda561a.jpg"`
- **Đặc điểm**: 
  - Bắt buộc
  - Lưu relative path từ root
  - File được lưu trong thư mục `backend/uploads/`
  - Có thể serve qua static file server
- **Vị trí code**: 
  - Upload: `backend/src/evidence/evidence.service.ts` (dòng 8-13)
  - Lưu: `backend/src/attendance/attendance.service.ts` (dòng 295)
  - Serve: `backend/src/app.module.ts` (dòng 27, static files)

### 4. `metaJson` (String)
- **Kiểu dữ liệu**: `String` (JSON string)
- **Ràng buộc**: NOT NULL
- **Mục đích**: Metadata của ảnh dưới dạng JSON string
- **Ví dụ**: `"{\"studentCode\":\"523H0001\",\"timestamp\":\"2024-01-15T10:30:45.123Z\"}"`
- **Đặc điểm**: 
  - Bắt buộc
  - Lưu dưới dạng JSON string (không phải JSON type)
  - Chứa: `studentCode`, `timestamp` (có thể mở rộng)
  - Dùng để query/search mà không cần parse ảnh
  - Tách biệt với watermark (watermark trong ảnh, metaJson trong DB)
- **Vị trí code**: 
  - Schema: `backend/prisma/schema.prisma` (dòng 95)
  - Tạo: `backend/src/attendance/attendance.service.ts` (dòng 296)
  - Frontend gửi: `frontend/src/pages/StudentOTPPage.tsx` (dòng 162-168)

### 5. `attendance` (Relation)
- **Kiểu dữ liệu**: `Attendance`
- **Mục đích**: Quan hệ nhiều-một với Attendance (1-1 thực tế)
- **Đặc điểm**: Virtual field, dùng để query thông tin attendance

---

## 📊 TÓM TẮT CÁC ENUM

### Enum: Role
```prisma
enum Role { 
  STUDENT    // Sinh viên (mặc định)
  LECTURER   // Giảng viên
  ADMIN      // Quản trị viên
}
```

### Enum: AttendanceMethod
```prisma
enum AttendanceMethod { 
  QR_GPS      // Điểm danh bằng QR code + GPS
  OTP_PHOTO   // Điểm danh bằng OTP + ảnh
  AUTO_IMPORT // Tự động tạo khi tạo session (placeholder)
}
```

### Enum: AttendanceStatus
```prisma
enum AttendanceStatus { 
  NOT_ATTENDED  // Chưa điểm danh (mặc định)
  PENDING       // Đã điểm danh, chờ duyệt
  APPROVED      // Đã được duyệt/điểm danh thành công
  REJECTED      // Bị từ chối
  TOO_FAR       // Quét QR nhưng GPS quá xa
}
```

---

## 🔑 CÁC RÀNG BUỘC QUAN TRỌNG

### Unique Constraints:
1. `User.email` - Email phải unique
2. `User.studentCode` - MSSV phải unique (nếu có)
3. `Class.code` - Mã lớp phải unique
4. `Session.publicCode` - Mã buổi phải unique (nếu có)
5. `Enrollment(classId, studentId)` - Mỗi SV chỉ đăng ký 1 lần/lớp
6. `Attendance(sessionId, studentId)` - Mỗi SV chỉ 1 điểm danh/buổi
7. `Evidence.attendanceId` - Mỗi attendance chỉ 1 evidence

### Foreign Keys với Cascade Delete:
1. `Enrollment.classId` → Xóa Class → Xóa Enrollment
2. `Enrollment.studentId` → Xóa User → Xóa Enrollment
3. `Session.classId` → Xóa Class → Xóa Session
4. `Attendance.sessionId` → Xóa Session → Xóa Attendance
5. `Attendance.studentId` → Xóa User → Xóa Attendance
6. `Evidence.attendanceId` → Xóa Attendance → Xóa Evidence

### Foreign Keys với SetNull:
1. `Class.lecturerId` → Xóa User (giảng viên) → `lecturerId = null` (không xóa lớp)

### Indexes:
1. `Session.classId` - Query sessions theo lớp
2. `Attendance.sessionId` - Query attendances theo buổi
3. `Attendance.studentId` - Query attendances theo sinh viên
4. `Class.lecturerId` - Query classes theo giảng viên

---

**Tài liệu này giải thích chi tiết tất cả các thuộc tính trong database schema. Sử dụng để tham khảo khi bảo vệ đồ án! 📚**

