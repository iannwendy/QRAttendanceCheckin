## Mối quan hệ giữa các bảng (theo Prisma schema)

- **User —< Enrollment >— Class**
  - **Loại**: nhiều–nhiều (User thuộc nhiều Class; Class có nhiều User)
  - **Triển khai**: bảng trung gian `Enrollment` với cặp unique `(classId, studentId)`
  - **Xóa dây chuyền**: xóa `User` hoặc `Class` sẽ xóa các `Enrollment` liên quan (`onDelete: Cascade`).

- **Class —< Session**
  - **Loại**: một–nhiều (mỗi lớp có nhiều buổi; mỗi buổi thuộc một lớp)
  - **Khóa ngoại**: `Session.classId → Class.id`.
  - **Chỉ mục**: `Session.classId` có index để truy vấn nhanh theo lớp.
  - **Xóa dây chuyền**: xóa `Class` sẽ xóa các `Session` liên quan.

- **Session —< Attendance**
  - **Loại**: một–nhiều (mỗi buổi có nhiều bản ghi điểm danh).
  - **Khóa ngoại**: `Attendance.sessionId → Session.id`.
  - **Ràng buộc**: unique `(sessionId, studentId)` đảm bảo mỗi sinh viên chỉ có tối đa 1 attendance/buổi.
  - **Chỉ mục**: `Attendance.sessionId` có index.
  - **Xóa dây chuyền**: xóa `Session` sẽ xóa các `Attendance` liên quan.

- **User —< Attendance**
  - **Loại**: một–nhiều (mỗi sinh viên có nhiều bản ghi điểm danh qua các buổi).
  - **Khóa ngoại**: `Attendance.studentId → User.id`.
  - **Chỉ mục**: `Attendance.studentId` có index.
  - **Xóa dây chuyền**: xóa `User` sẽ xóa các `Attendance` liên quan.

- **Attendance —1—0..1 Evidence**
  - **Loại**: một–một (tùy chọn ở phía Evidence).
  - **Khóa**: `Evidence.attendanceId` unique → mỗi `Attendance` có tối đa 1 `Evidence`.
  - **Xóa dây chuyền**: xóa `Attendance` sẽ xóa `Evidence`.

## Tóm tắt ràng buộc và chỉ mục quan trọng

- **Unique**:
  - `User.email`, `User.studentCode?`
  - `Class.code`
  - `Enrollment (classId, studentId)`
  - `Attendance (sessionId, studentId)`
  - `Evidence.attendanceId`

- **Index**:
  - `Session.classId`
  - `Attendance.sessionId`, `Attendance.studentId`

- **Cascade delete**:
  - Xóa `Class` → `Session`, `Enrollment` (và kéo theo `Attendance` của các `Session`, rồi `Evidence`).
  - Xóa `User` → `Enrollment`, `Attendance` (kéo theo `Evidence`).
  - Xóa `Session` → `Attendance` (kéo theo `Evidence`).
  - Xóa `Attendance` → `Evidence`.

## Ghi chú về tên trong sơ đồ ERD

- Trong ảnh ERD (`docs/erd.png`), các tên `CLASSROOM`, `SESSION_REC`, `ATTENDANCE_REC`, `EVIDENCE_REC` là alias kỹ thuật để Mermaid CLI render ổn định (tránh trùng từ khóa như `CLASS`).
- Chúng tương ứng 1-1 với bảng thực tế: `Class`, `Session`, `Attendance`, `Evidence` trong Prisma schema.


