# Facade Pattern - Mẫu Thiết Kế Facade

## 1. Giới thiệu Pattern

**Facade** là một mẫu thiết kế thuộc nhóm **Structural** (Cấu trúc), cung cấp giao diện đơn giản hóa cho một tập hợp các interface phức tạp trong hệ thống. Facade giúp client tương tác với hệ thống một cách dễ dàng hơn mà không cần biết chi tiết bên trong phức tạp.

---

## 2. Bối cảnh áp dụng

Trong hệ thống QR Attendance, khi sinh viên check-in bằng QR code, quy trình bao gồm nhiều bước phức tạp:

1. **Verify QR Token** - Xác thực mã QR (có thể là JWT, JSON, hoặc định dạng khác)
2. **Get Session** - Lấy thông tin buổi học từ database
3. **Check Enrollment** - Kiểm tra sinh viên có đăng ký lớp học không
4. **Calculate Distance** - Tính khoảng cách GPS giữa sinh viên và điểm danh
5. **Create/Update Attendance** - Tạo hoặc cập nhật bản ghi điểm danh

Tất cả logic này tập trung trong `AttendanceService.checkInQR()` ~150 dòng code, gây khó khăn trong bảo trì và test.

---

## 3. Code Cũ (Không dùng Facade)

**File:** `src/attendance/attendance.service.ts`

```typescript
async checkInQR(studentId: string, dto: CheckInQRDto) {
  // Bước 1: Verify QR Token (nhiều định dạng)
  let qrPayload: QRTokenPayload;
  try {
    qrPayload = jwt.verify(dto.qrToken, this.config.get('JWT_SECRET'));
  } catch {
    try {
      qrPayload = JSON.parse(dto.qrToken);
    } catch {
      const parts = dto.qrToken.split('.');
      if (parts.length === 3) {
        qrPayload = { sessionId: parts[0], userId: parts[1], exp: parseInt(parts[2]) };
      } else {
        throw new BadRequestException('Invalid QR token format');
      }
    }
  }

  // Bước 2: Get Session từ database
  const session = await this.prisma.session.findUnique({
    where: { id: qrPayload.sessionId }
  });
  if (!session) {
    throw new NotFoundException('Session not found');
  }

  // Bước 3: Check Enrollment
  const enrollment = await this.prisma.enrollment.findFirst({
    where: { studentId, classId: session.classId }
  });
  if (!enrollment) {
    throw new ForbiddenException('Student not enrolled in this class');
  }

  // Bước 4: Tính khoảng cách GPS
  const distance = this.calculateDistance(
    dto.lat, dto.lng,
    session.latitude, session.longitude
  );
  const isInGeofence = distance <= session.geofenceRadius;

  // Bước 5: Create/Update Attendance
  if (!isInGeofence) {
    return {
      success: false,
      status: 'TOO_FAR',
      message: `Bạn đang cách điểm danh ${Math.round(distance)}m (tối đa ${session.geofenceRadius}m)`,
      distance: Math.round(distance)
    };
  }

  const existingAttendance = await this.prisma.attendance.findFirst({
    where: { studentId, sessionId: session.id }
  });

  if (existingAttendance) {
    return { success: true, status: 'ALREADY_CHECKED', message: 'Đã điểm danh trước đó' };
  }

  const attendance = await this.prisma.attendance.create({
    data: {
      studentId,
      sessionId: session.id,
      status: 'APPROVED',
      checkInTime: new Date(),
      method: 'QR'
    }
  });

  return { success: true, status: 'APPROVED', message: 'Điểm danh thành công', attendance };
}
```

---

## 4. Code Mới (Sử dụng Facade)

**File:** `src/attendance/facades/attendance-checkin.facade.ts`

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QRTokenService, QRTokenPayload } from '../../common/utils/qr-token.util';
import { haversineDistance } from '../../common/utils/geography.util';
import { AttendanceMethod, AttendanceStatus } from '@prisma/client';

export interface CheckInResult {
  success: boolean;
  status: AttendanceStatus;
  message: string;
  attendance?: any;
}

@Injectable()
export class AttendanceCheckInFacade {
  constructor(
    private prisma: PrismaService,
    private qrTokenService: QRTokenService,
  ) {}

  /**
   * Parse QR token với nhiều định dạng
   */
  private parseQRToken(qrToken: string): QRTokenPayload | null {
    // Thử JWT verify
    let qrPayload = this.qrTokenService.verifyQRToken(qrToken);

    // Thử parse JSON
    if (!qrPayload) {
      try {
        const parsed = JSON.parse(qrToken);
        if (parsed.sessionId && parsed.nonce) {
          const now = Math.floor(Date.now() / 1000);
          if (parsed.exp && parsed.exp >= now) {
            qrPayload = parsed;
          }
        }
      } catch { /* Ignore */ }
    }

    // Fallback: decode không verify
    if (!qrPayload) {
      try {
        const parts = qrToken.split('.');
        if (parts.length === 3) {
          const json = Buffer.from(
            parts[1].replace(/-/g, '+').replace(/_/g, '/'),
            'base64',
          ).toString('utf8');
          const decoded = JSON.parse(json);
          const now = Math.floor(Date.now() / 1000);
          if (decoded && decoded.sessionId && decoded.exp && decoded.exp >= now) {
            qrPayload = decoded;
          }
        }
      } catch { /* ignore */ }
    }

    return qrPayload;
  }

  /**
   * Lấy session từ database
   */
  private async getSession(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: { include: { students: true } },
      },
    });
  }

  /**
   * Check-in hoàn chỉnh với studentId
   */
  async completeCheckIn(
    studentId: string,
    qrToken: string,
    lat: number,
    lng: number,
    accuracy?: number,
  ): Promise<CheckInResult> {
    // Parse và lấy session
    const qrPayload = this.parseQRToken(qrToken);
    if (!qrPayload) {
      throw new BadRequestException('QR token không hợp lệ hoặc đã hết hạn');
    }

    const session = await this.getSession(qrPayload.sessionId);
    if (!session) {
      throw new BadRequestException('Buổi học không tồn tại');
    }

    // Kiểm tra enrollment
    const isEnrolled = session.class.students.some(
      (s) => s.studentId === studentId,
    );
    if (!isEnrolled) {
      throw new BadRequestException('Bạn chưa đăng ký lớp này');
    }

    // Tính khoảng cách
    const distance = haversineDistance(
      lat, lng,
      session.latitude, session.longitude,
    );

    const isInGeofence = distance <= session.geofenceRadius;

    // Kiểm tra attendance hiện có
    const existing = await this.prisma.attendance.findUnique({
      where: {
        sessionId_studentId: { sessionId: session.id, studentId },
      },
    });

    // Tạo hoặc cập nhật attendance
    let attendance;
    if (existing) {
      if (existing.status === AttendanceStatus.APPROVED) {
        return { success: true, status: existing.status, message: 'Đã điểm danh trước đó', attendance: existing };
      }

      attendance = await this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          method: AttendanceMethod.QR_GPS,
          status: isInGeofence ? AttendanceStatus.APPROVED : AttendanceStatus.TOO_FAR,
          lat, lng, accuracy,
        },
      });
    } else {
      attendance = await this.prisma.attendance.create({
        data: {
          sessionId: session.id, studentId,
          method: AttendanceMethod.QR_GPS,
          status: isInGeofence ? AttendanceStatus.APPROVED : AttendanceStatus.TOO_FAR,
          lat, lng, accuracy,
        },
      });
    }

    return {
      success: isInGeofence,
      status: attendance.status,
      message: isInGeofence ? 'Điểm danh thành công' : 'Bạn đang ở ngoài vùng điểm danh',
      attendance,
    };
  }
}
```

**Cách sử dụng trong AttendanceService:**

```typescript
async checkInQR(studentId: string, checkInDto: CheckInQRDto) {
  // Use Facade to process check-in
  const checkInResult = await this.checkInFacade.completeCheckIn(
    studentId,
    checkInDto.qrToken,
    checkInDto.lat,
    checkInDto.lng,
    checkInDto.accuracy,
  );

  // Publish observer event (nếu có)
  if (checkInResult.attendance) {
    await this.publishAttendanceEvent({...});
  }

  // Use Factory to create response (xem Factory Pattern)
  return AttendanceResponseFactory.create(
    checkInResult.attendance?.status || checkInResult.status,
    checkInResult.attendance || { status: checkInResult.status, message: checkInResult.message },
  );
}
```

---

## 5. Giải thích tại sao áp dụng Facade

### Vấn đề gặp phải:
- Method `checkInQR` trong AttendanceService quá dài (~150 dòng)
- Chịu trách nhiệm quá nhiều việc (violation of Single Responsibility Principle)
- Khó test từng bước riêng lẻ
- Khi cần sửa một bước, phải đọc toàn bộ method

### Giải pháp Facade:
- Tạo Facade class riêng để orchestrate các bước check-in
- Mỗi bước được xử lý bởi service chuyên biệt
- Client chỉ cần gọi một method duy nhất

---

## 6. Lợi ích của Facade Pattern

| Tiêu chí | Trước khi dùng Facade | Sau khi dùng Facade |
|----------|----------------------|---------------------|
| **Độ dài method** | ~150 dòng | ~30 dòng |
| **Khả năng test** | Khó test từng bước | Dễ dàng test từng bước |
| **Bảo trì** | Khó sửa đổi | Dễ dàng sửa đổi từng bước |
| **Tái sử dụng** | Không | Có thể tái sử dụng các service |
| **Độ phức tạp** | Cao với client | Thấp với client |

### Các lợi ích cụ thể:

1. **Giảm độ phức tạp cho Client**
   - Client chỉ cần gọi `facade.completeCheckIn()` thay vì gọi nhiều service

2. **Tách biệt trách nhiệm**
   - Facade không chứa logic nghiệp vụ, chỉ orchestrate các bước

3. **Dễ dàng mở rộng**
   - Thêm/bớt bước không ảnh hưởng đến client

4. **Tăng khả năng bảo trì**
   - Mỗi service có trách nhiệm rõ ràng

---

## 7. Sơ đồ Class

```mermaid
classDiagram
    class AttendanceController {
        +checkInQR()
    }

    class AttendanceService {
        -checkInFacade: AttendanceCheckInFacade
        +checkInQR()
    }

    class AttendanceCheckInFacade {
        -prisma: PrismaService
        -qrTokenService: QRTokenService
        +completeCheckIn()
        -parseQRToken()
        -getSession()
    }

    class QRTokenService {
        +verifyQRToken()
    }

    class PrismaService {
        +session.findUnique()
        +attendance.create()
        +attendance.update()
    }

    class AttendanceResponseFactory {
        +create()
    }

    AttendanceController --> AttendanceService
    AttendanceService --> AttendanceCheckInFacade
    AttendanceCheckInFacade --> QRTokenService
    AttendanceCheckInFacade --> PrismaService
    AttendanceService --> AttendanceResponseFactory
```

---

## 8. Kết luận

Facade Pattern giúp đơn giản hóa việc tương tác với các subsystem phức tạp. Trong hệ thống QR Attendance, Facade cho phép:

- ✅ Tách biệt rõ ràng giữa orchestration và business logic
- ✅ Dễ dàng test từng thành phần
- ✅ Code gọn gàng, dễ đọc
- ✅ Dễ dàng mở rộng khi cần thêm tính năng

**Khuyến nghị:** Sử dụng Facade khi hệ thống có nhiều service phối hợp với nhau và client cần gọi nhiều bước để hoàn thành một tác vụ.

