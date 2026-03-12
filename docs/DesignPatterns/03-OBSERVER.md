# Observer Pattern - Mẫu Thiết Kế Observer

## 1. Giới thiệu Pattern

**Observer** là mẫu thiết kế thuộc nhóm **Behavioral** (Hành vi), định nghĩa mối phụ thuộc một-nhiều giữa các đối tượng để khi một đối tượng thay đổi trạng thái, tất cả các đối tượng phụ thuộc sẽ được thông báo và cập nhật tự động.

---

## 2. Bối cảnh áp dụng

Trong hệ thống QR Attendance, khi có sự kiện điểm danh:
- Sinh viên check-in thành công → Gửi email thông báo
- Giảng viên duyệt/từ chối → Thông báo cho sinh viên
- Điểm danh bị từ chối → Gửi thông báo kèm lý do
- Buổi học bắt đầu → Thông báo nhắc nhở

Cần một cơ chế để các thành phần khác "lắng nghe" sự kiện này mà không làm phức tạp hóa AttendanceService.

---

## 3. Code Cũ (Không dùng Observer)

**File:** `src/attendance/attendance.service.ts`

```typescript
async approveAttendance(id: string, lecturerId: string) {
  // Logic approve
  const attendance = await this.prisma.attendance.update({
    where: { id },
    data: { status: 'APPROVED', approvedBy: lecturerId, approvedAt: new Date() }
  });
  
  // Gửi email thủ công - vi phạm SRP
  await this.emailService.send({
    to: attendance.studentEmail,
    subject: 'Điểm danh được duyệt',
    body: `Điểm danh ngày ${attendance.checkInTime} đã được duyệt`
  });
  
  // Gửi notification
  await this.notificationService.push(attendance.studentId, {
    title: 'Điểm danh được duyệt',
    body: 'Điểm danh của bạn đã được giảng viên duyệt'
  });
  
  // Log cho hệ thống
  await this.auditLogService.log({
    action: 'APPROVE_ATTENDANCE',
    attendanceId: id,
    lecturerId
  });
  
  return attendance;
}

async rejectAttendance(id: string, reason: string) {
  const attendance = await this.prisma.attendance.update({
    where: { id },
    data: { status: 'REJECTED', rejectReason: reason }
  });
  
  // Lặp lại logic thông báo
  await this.emailService.send({ to: attendance.studentEmail, subject: 'Điểm danh bị từ chối', body: reason });
  await this.notificationService.push(attendance.studentId, { title: 'Điểm danh bị từ chối', body: reason });
  await this.auditLogService.log({ action: 'REJECT_ATTENDANCE', attendanceId: id, reason });
  
  return attendance;
}

async createAttendance(data: CreateAttendanceDto) {
  const attendance = await this.prisma.attendance.create({ data });
  
  // Gửi thông báo cho giảng viên
  await this.emailService.send({
    to: data.lecturerEmail,
    subject: 'Có sinh viên điểm danh',
    body: `Sinh viên ${data.studentName} đã điểm danh`
  });
  
  return attendance;
}
```

---

## 4. Code Mới (Sử dụng Observer)

**File:** `src/attendance/observers/attendance-observer.ts`

```typescript
import { Injectable } from '@nestjs/common';

// ============ Observer Interface ============
export interface AttendanceObserver {
  onAttendanceApproved(attendance: Attendance): Promise<void>;
  onAttendanceRejected(attendance: Attendance, reason: string): Promise<void>;
  onAttendanceCreated(attendance: Attendance): Promise<void>;
}

// ============ Email Notification Observer ============
@Injectable()
export class EmailNotificationObserver implements AttendanceObserver {
  constructor(private emailService: EmailService) {}

  async onAttendanceApproved(attendance: Attendance): Promise<void> {
    await this.emailService.send({
      to: attendance.studentEmail,
      subject: '✅ Điểm danh được duyệt',
      body: `Điểm danh ngày ${attendance.checkInTime} đã được duyệt bởi giảng viên.`
    });
  }

  async onAttendanceRejected(attendance: Attendance, reason: string): Promise<void> {
    await this.emailService.send({
      to: attendance.studentEmail,
      subject: '❌ Điểm danh bị từ chối',
      body: `Điểm danh của bạn bị từ chối. Lý do: ${reason}`
    });
  }

  async onAttendanceCreated(attendance: Attendance): Promise<void> {
    // Có thể gửi email xác nhận cho sinh viên
  }
}

// ============ Push Notification Observer ============
@Injectable()
export class PushNotificationObserver implements AttendanceObserver {
  constructor(private notificationService: NotificationService) {}

  async onAttendanceApproved(attendance: Attendance): Promise<void> {
    await this.notificationService.push(attendance.studentId, {
      title: 'Điểm danh được duyệt',
      body: 'Điểm danh của bạn đã được giảng viên duyệt'
    });
  }

  async onAttendanceRejected(attendance: Attendance, reason: string): Promise<void> {
    await this.notificationService.push(attendance.studentId, {
      title: 'Điểm danh bị từ chối',
      body: reason
    });
  }

  async onAttendanceCreated(attendance: Attendance): Promise<void> {
    await this.notificationService.push(attendance.lecturerId, {
      title: 'Có điểm danh mới',
      body: `Sinh viên ${attendance.studentName} đã điểm danh`
    });
  }
}

// ============ Audit Log Observer ============
@Injectable()
export class AuditLogObserver implements AttendanceObserver {
  constructor(private auditLogService: AuditLogService) {}

  async onAttendanceApproved(attendance: Attendance): Promise<void> {
    await this.auditLogService.log({
      action: 'APPROVE_ATTENDANCE',
      attendanceId: attendance.id,
      timestamp: new Date()
    });
  }

  async onAttendanceRejected(attendance: Attendance, reason: string): Promise<void> {
    await this.auditLogService.log({
      action: 'REJECT_ATTENDANCE',
      attendanceId: attendance.id,
      reason,
      timestamp: new Date()
    });
  }

  async onAttendanceCreated(attendance: Attendance): Promise<void> {
    await this.auditLogService.log({
      action: 'CREATE_ATTENDANCE',
      attendanceId: attendance.id,
      timestamp: new Date()
    });
  }
}

// ============ Subject (Publisher) ============
@Injectable()
export class AttendanceSubject {
  private observers: AttendanceObserver[] = [];

  constructor(
    private emailObserver: EmailNotificationObserver,
    private pushObserver: PushNotificationObserver,
    private auditObserver: AuditLogObserver
  ) {
    // Đăng ký tất cả observers mặc định
    this.observers.push(emailObserver, pushObserver, auditObserver);
  }

  subscribe(observer: AttendanceObserver): void {
    this.observers.push(observer);
  }

  unsubscribe(observer: AttendanceObserver): void {
    this.observers = this.observers.filter(o => o !== observer);
  }

  async notifyApproved(attendance: Attendance): Promise<void> {
    await Promise.all(
      this.observers.map(observer => observer.onAttendanceApproved(attendance))
    );
  }

  async notifyRejected(attendance: Attendance, reason: string): Promise<void> {
    await Promise.all(
      this.observers.map(observer => observer.onAttendanceRejected(attendance, reason))
    );
  }

  async notifyCreated(attendance: Attendance): Promise<void> {
    await Promise.all(
      this.observers.map(observer => observer.onAttendanceCreated(attendance))
    );
  }
}
```

---

## 5. Cách sử dụng trong AttendanceService

```typescript
// Trong AttendanceService
import { AttendanceSubject } from '../observers/attendance-observer';

@Injectable()
export class AttendanceService {
  constructor(
    private attendanceSubject: AttendanceSubject,
    // các service khác
  ) {}

  async approveAttendance(id: string, lecturerId: string) {
    const attendance = await this.prisma.attendance.update({
      where: { id },
      data: { status: 'APPROVED', approvedBy: lecturerId, approvedAt: new Date() }
    });
    
    // Thông báo cho tất cả observers
    await this.attendanceSubject.notifyApproved(attendance);
    
    return attendance;
  }

  async rejectAttendance(id: string, reason: string) {
    const attendance = await this.prisma.attendance.update({
      where: { id },
      data: { status: 'REJECTED', rejectReason: reason }
    });
    
    await this.attendanceSubject.notifyRejected(attendance, reason);
    
    return attendance;
  }
}
```

---

## 6. Giải thích tại sao áp dụng Observer

### Vấn đề gặp phải:
- AttendanceService phải gọi nhiều service khác (email, notification, audit)
- Vi phạm Single Responsibility Principle
- Khó thêm/bớt tính năng thông báo
- Khó test vì phụ thuộc nhiều service

### Giải pháp Observer:
- Tách logic thông báo ra các Observer riêng biệt
- AttendanceService chỉ cần gọi subject.notify()
- Thêm observer mới không cần sửa code cũ

---

## 7. Lợi ích của Observer Pattern

| Tiêu chí | Trước khi dùng Observer | Sau khi dùng Observer |
|----------|------------------------|---------------------|
| **SRP** | Vi phạm - Service làm quá nhiều việc | Tuân thủ - Mỗi observer một việc |
| **Thêm tính năng** | Sửa AttendanceService | Thêm Observer mới |
| **Bớt tính năng** | Xóa code trong Service | Gỡ Observer |
| **Test** | Khó mock nhiều dependency | Dễ test từng Observer |
| **Coupling** | Cao (tight coupling) | Thấp (loose coupling) |

### Các lợi ích cụ thể:

1. **Loose Coupling**
   - Subject và Observer không biết về nhau

2. **Dễ mở rộng**
   - Thêm observer mới không ảnh hưởng code cũ

3. **Dễ bảo trì**
   - Mỗi observer có trách nhiệm rõ ràng

4. **Dễ test**
   - Test từng observer độc lập

---

## 8. Sơ đồ Class

```mermaid
classDiagram
    class AttendanceSubject {
        -observers: AttendanceObserver[]
        +subscribe(observer)
        +unsubscribe(observer)
        +notifyApproved(attendance)
        +notifyRejected(attendance, reason)
    }
    
    class <<interface>> AttendanceObserver {
        +onAttendanceApproved(attendance)
        +onAttendanceRejected(attendance, reason)
        +onAttendanceCreated(attendance)
    }
    
    AttendanceSubject --> AttendanceObserver
    
    AttendanceObserver <|.. EmailNotificationObserver
    AttendanceObserver <|.. PushNotificationObserver
    AttendanceObserver <|.. AuditLogObserver
    
    class EmailNotificationObserver {
        +onAttendanceApproved(attendance)
        +onAttendanceRejected(attendance, reason)
    }
    
    class PushNotificationObserver {
        +onAttendanceApproved(attendance)
        +onAttendanceRejected(attendance, reason)
    }
    
    class AuditLogObserver {
        +onAttendanceApproved(attendance)
        +onAttendanceRejected(attendance, reason)
    }
```

---

## 9. Kết luận

Observer Pattern giúp tách biệt logic nghiệp vụ khỏi logic thông báo:

- ✅ Tuân thủ Single Responsibility Principle
- ✅ Dễ dàng thêm/bớt tính năng thông báo
- ✅ Code gọn gàng, dễ bảo trì
- ✅ Dễ test từng thành phần

**Khuyến nghị:** Sử dụng Observer khi một thay đổi cần thông báo cho nhiều thành phần khác nhau mà không muốn chúng coupled chặt với nhau.

