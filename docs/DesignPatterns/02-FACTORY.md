# Factory Pattern - Mẫu Thiết Kế Factory

## 1. Giới thiệu Pattern

**Factory** là mẫu thiết kế thuộc nhóm **Creational** (Khởi tạo), cung cấp interface để tạo đối tượng mà không cần chỉ định lớp cụ thể của đối tượng đó. Factory pattern cho phép delegate việc khởi tạo cho các subclass.

---

## 2. Bối cảnh áp dụng

Trong hệ thống QR Attendance, khi điểm danh có nhiều trạng thái khác nhau:
- **APPROVED** - Điểm danh thành công
- **PENDING** - Chờ duyệt
- **REJECTED** - Bị từ chối
- **TOO_FAR** - Cách quá xa điểm danh

Mỗi trạng thái cần trả về response với cấu trúc khác nhau (message, metadata, timestamp...)

---

## 3. Code Cũ (Không dùng Factory)

**File:** `src/attendance/attendance.service.ts`

```typescript
async checkInQR(studentId: string, dto: CheckInQRDto) {
  const result = await this.processCheckInLogic(...);

  // Tạo response thủ công cho từng trạng thái
  if (result.status === 'APPROVED') {
    return {
      success: true,
      message: 'Điểm danh thành công',
      status: 'APPROVED',
      timestamp: new Date(),
      attendance: result.attendance
    };
  } else if (result.status === 'TOO_FAR') {
    return {
      success: false,
      message: 'Bạn đang ở quá xa điểm danh',
      status: 'TOO_FAR',
      distance: result.distance,
      maxDistance: result.maxDistance
    };
  } else if (result.status === 'ALREADY_CHECKED') {
    return {
      success: true,
      message: 'Bạn đã điểm danh trước đó',
      status: 'ALREADY_CHECKED',
      checkInTime: result.checkInTime
    };
  } else if (result.status === 'REJECTED') {
    return {
      success: false,
      message: result.reason || 'Điểm danh bị từ chối',
      status: 'REJECTED',
      reason: result.reason
    };
  }

  // Lặp lại logic tạo response...
}

async approveAttendance(id: string, lecturerId: string) {
  const attendance = await this.prisma.attendance.update({
    where: { id },
    data: { status: 'APPROVED', approvedBy: lecturerId, approvedAt: new Date() }
  });

  return {
    success: true,
    message: 'Duyệt điểm danh thành công',
    status: 'APPROVED',
    timestamp: new Date(),
    attendance
  };
}

async rejectAttendance(id: string, reason: string) {
  const attendance = await this.prisma.attendance.update({
    where: { id },
    data: { status: 'REJECTED', rejectReason: reason }
  });

  return {
    success: false,
    message: 'Từ chối điểm danh',
    status: 'REJECTED',
    reason: reason,
    attendance
  };
}
```

---

## 4. Code Mới (Sử dụng Factory)

**File:** `src/attendance/factories/attendance-response.factory.ts`

```typescript
import { AttendanceStatus, AttendanceMethod } from '@prisma/client';

export interface AttendanceResponse {
  success: boolean;
  status: AttendanceStatus;
  message: string;
  attendanceId?: string;
  method?: AttendanceMethod;
  timestamp?: Date;
}

/**
 * Interface cho các Attendance Response Builder
 */
export interface AttendanceResponseBuilder {
  build(data: any): AttendanceResponse;
}

/**
 * Builder cho trạng thái APPROVED
 */
export class ApprovedAttendanceBuilder implements AttendanceResponseBuilder {
  build(data: any): AttendanceResponse {
    return {
      success: true,
      status: AttendanceStatus.APPROVED,
      message: 'Điểm danh thành công',
      attendanceId: data.id,
      method: data.method,
      timestamp: data.updatedAt || new Date(),
    };
  }
}

/**
 * Builder cho trạng thái PENDING
 */
export class PendingAttendanceBuilder implements AttendanceResponseBuilder {
  build(data: any): AttendanceResponse {
    return {
      success: true,
      status: AttendanceStatus.PENDING,
      message: 'Điểm danh thành công, chờ giảng viên duyệt',
      attendanceId: data.id,
      method: data.method,
      timestamp: data.updatedAt || new Date(),
    };
  }
}

/**
 * Builder cho trạng thái REJECTED
 */
export class RejectedAttendanceBuilder implements AttendanceResponseBuilder {
  build(data: any): AttendanceResponse {
    return {
      success: false,
      status: AttendanceStatus.REJECTED,
      message: 'Điểm danh bị từ chối',
      attendanceId: data.id,
      method: data.method,
      timestamp: data.updatedAt || new Date(),
    };
  }
}

/**
 * Builder cho trạng thái TOO_FAR
 */
export class TooFarAttendanceBuilder implements AttendanceResponseBuilder {
  build(data: any): AttendanceResponse {
    return {
      success: false,
      status: AttendanceStatus.TOO_FAR as any,
      message: 'Bạn đang ở ngoài vùng điểm danh',
      attendanceId: data.id,
      method: data.method,
      timestamp: data.updatedAt || new Date(),
    };
  }
}

/**
 * Factory tạo AttendanceResponse phù hợp với từng loại status
 */
export class AttendanceResponseFactory {
  private static builders: Map<AttendanceStatus, AttendanceResponseBuilder> =
    new Map([
      [AttendanceStatus.APPROVED, new ApprovedAttendanceBuilder()],
      [AttendanceStatus.PENDING, new PendingAttendanceBuilder()],
      [AttendanceStatus.REJECTED, new RejectedAttendanceBuilder()],
      [AttendanceStatus.TOO_FAR, new TooFarAttendanceBuilder()],
    ]);

  /**
   * Tạo response dựa trên status
   */
  static create(status: AttendanceStatus, data: any): AttendanceResponse {
    const builder = AttendanceResponseFactory.builders.get(status);

    if (!builder) {
      return {
        success: false,
        status,
        message: 'Trạng thái không xác định',
        attendanceId: data?.id,
      };
    }

    return builder.build(data);
  }

  /**
   * Đăng ký builder mới cho một status
   */
  static registerBuilder(
    status: AttendanceStatus,
    builder: AttendanceResponseBuilder
  ): void {
    AttendanceResponseFactory.builders.set(status, builder);
  }
}
```

**Cách sử dụng trong AttendanceService:**

```typescript
import { AttendanceResponseFactory } from './factories/attendance-response.factory';

async checkInQR(studentId: string, checkInDto: CheckInQRDto) {
  const checkInResult = await this.checkInFacade.completeCheckIn(...);

  // Use Factory to create response
  return AttendanceResponseFactory.create(
    checkInResult.attendance?.status || checkInResult.status,
    checkInResult.attendance || checkInResult
  );
}

async approveAttendance(id: string) {
  const attendance = await this.prisma.attendance.update({
    where: { id },
    data: { status: AttendanceStatus.APPROVED }
  });

  return AttendanceResponseFactory.create(attendance.status, attendance);
}

async rejectAttendance(id: string) {
  const attendance = await this.prisma.attendance.update({
    where: { id },
    data: { status: AttendanceStatus.REJECTED }
  });

  return AttendanceResponseFactory.create(attendance.status, attendance);
}
```

---

## 5. Giải thích tại sao áp dụng Factory

### Vấn đề gặp phải:
- Logic tạo response lặp lại nhiều lần trong các method
- Khi cần thay đổi cấu trúc response, phải sửa nhiều nơi
- Khó thêm trạng thái mới mà không ảnh hưởng code hiện tại

### Giải pháp Factory:
- Tách logic tạo response ra từng Builder class riêng biệt
- Factory quản lý việc chọn Builder phù hợp
- Thêm trạng thái mới không cần sửa code cũ

---

## 6. Lợi ích của Factory Pattern

| Tiêu chí | Trước khi dùng Factory | Sau khi dùng Factory |
|----------|----------------------|---------------------|
| **Số dòng code trùng lặp** | ~50 dòng lặp lại | 0 dòng trùng lặp |
| **Thêm status mới** | Sửa nhiều method | Thêm 1 Builder + đăng ký |
| **Bảo trì** | Khó sửa response | Sửa 1 Builder duy nhất |
| **Test** | Khó test logic response | Dễ test từng Builder |

### Các lợi ích cụ thể:

1. **Single Responsibility**
   - Mỗi Builder chỉ lo một loại response

2. **Open/Closed Principle**
   - Thêm status mới không sửa code cũ

3. **Dễ mở rộng**
   - Chỉ cần tạo class mới implements AttendanceResponseBuilder

4. **Dễ test**
   - Test từng Builder độc lập

---

## 7. Sơ đồ Class

```mermaid
classDiagram
    class AttendanceController {
        +checkInQR()
        +approve()
        +reject()
    }

    class AttendanceService {
        -checkInFacade: AttendanceCheckInFacade
        +checkInQR()
        +approveAttendance()
        +rejectAttendance()
    }

    class AttendanceResponseFactory {
        +static builders: Map
        +static create(status, data): AttendanceResponse
        +static registerBuilder(status, builder)
    }

    class <<interface>> AttendanceResponseBuilder {
        +build(data): AttendanceResponse
    }

    AttendanceResponseFactory --> AttendanceResponseBuilder

    AttendanceResponseBuilder <|.. ApprovedAttendanceBuilder
    AttendanceResponseBuilder <|.. PendingAttendanceBuilder
    AttendanceResponseBuilder <|.. RejectedAttendanceBuilder
    AttendanceResponseBuilder <|.. TooFarAttendanceBuilder

    class ApprovedAttendanceBuilder {
        +build(data): AttendanceResponse
    }

    class PendingAttendanceBuilder {
        +build(data): AttendanceResponse
    }

    class RejectedAttendanceBuilder {
        +build(data): AttendanceResponse
    }

    class TooFarAttendanceBuilder {
        +build(data): AttendanceResponse
    }

    AttendanceController --> AttendanceService
    AttendanceService --> AttendanceResponseFactory
```

---

## 8. Kết luận

Factory Pattern giúp quản lý việc tạo các đối tượng phức tạp một cách có tổ chức:

- ✅ Tách biệt logic khởi tạo khỏi business logic
- ✅ Dễ dàng thêm loại response mới
- ✅ Code gọn gàng, dễ bảo trì
- ✅ Dễ test từng thành phần

**Khuyến nghị:** Sử dụng Factory khi hệ thống có nhiều loại đối tượng cần tạo với logic khởi tạo phức tạp hoặc có thể thay đổi.

