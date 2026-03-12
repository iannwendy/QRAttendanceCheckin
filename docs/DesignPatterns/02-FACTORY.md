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
- **ALREADY_CHECKED** - Đã điểm danh rồi

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
import { Injectable } from '@nestjs/common';

export enum AttendanceStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  TOO_FAR = 'TOO_FAR',
  ALREADY_CHECKED = 'ALREADY_CHECKED',
  NOT_ENROLLED = 'NOT_ENROLLED'
}

export interface AttendanceResponseBuilder {
  build(data: any): AttendanceResponse;
}

export interface AttendanceResponse {
  success: boolean;
  message: string;
  status: AttendanceStatus;
  timestamp?: Date;
  data?: any;
}

// ============ APPROVED Builder ============
export class ApprovedAttendanceBuilder implements AttendanceResponseBuilder {
  build(data: any): AttendanceResponse {
    return {
      success: true,
      message: data.message || 'Điểm danh thành công',
      status: AttendanceStatus.APPROVED,
      timestamp: new Date(),
      data: {
        attendance: data.attendance,
        checkInTime: data.attendance?.checkInTime
      }
    };
  }
}

// ============ TOO_FAR Builder ============
export class TooFarAttendanceBuilder implements AttendanceResponseBuilder {
  build(data: any): AttendanceResponse {
    return {
      success: false,
      message: `Bạn đang cách điểm danh ${data.distance}m (tối đa ${data.maxDistance}m)`,
      status: AttendanceStatus.TOO_FAR,
      timestamp: new Date(),
      data: {
        distance: data.distance,
        maxDistance: data.maxDistance,
        requiredAction: 'Di chuyển gần hơn để điểm danh'
      }
    };
  }
}

// ============ ALREADY_CHECKED Builder ============
export class AlreadyCheckedAttendanceBuilder implements AttendanceResponseBuilder {
  build(data: any): AttendanceResponse {
    return {
      success: true,
      message: 'Bạn đã điểm danh trước đó',
      status: AttendanceStatus.ALREADY_CHECKED,
      timestamp: new Date(),
      data: {
        checkInTime: data.checkInTime,
        originalCheckInTime: data.originalCheckInTime
      }
    };
  }
}

// ============ REJECTED Builder ============
export class RejectedAttendanceBuilder implements AttendanceResponseBuilder {
  build(data: any): AttendanceResponse {
    return {
      success: false,
      message: data.reason || 'Điểm danh bị từ chối',
      status: AttendanceStatus.REJECTED,
      timestamp: new Date(),
      data: {
        reason: data.reason,
        attendance: data.attendance
      }
    };
  }
}

// ============ PENDING Builder ============
export class PendingAttendanceBuilder implements AttendanceResponseBuilder {
  build(data: any): AttendanceResponse {
    return {
      success: true,
      message: 'Điểm danh chờ giảng viên duyệt',
      status: AttendanceStatus.PENDING,
      timestamp: new Date(),
      data: {
        attendance: data.attendance,
        requiresApproval: true
      }
    };
  }
}

// ============ Factory Class ============
@Injectable()
export class AttendanceResponseFactory {
  private static builders: Map<AttendanceStatus, AttendanceResponseBuilder> =
    new Map([
      [AttendanceStatus.APPROVED, new ApprovedAttendanceBuilder()],
      [AttendanceStatus.PENDING, new PendingAttendanceBuilder()],
      [AttendanceStatus.REJECTED, new RejectedAttendanceBuilder()],
      [AttendanceStatus.TOO_FAR, new TooFarAttendanceBuilder()],
      [AttendanceStatus.ALREADY_CHECKED, new AlreadyCheckedAttendanceBuilder()],
    ]);

  static create(status: AttendanceStatus, data: any): AttendanceResponse {
    const builder = this.builders.get(status);
    if (!builder) {
      throw new Error(`Unknown attendance status: ${status}`);
    }
    return builder.build(data);
  }

  // Thêm status mới dễ dàng
  static register(status: AttendanceStatus, builder: AttendanceResponseBuilder) {
    this.builders.set(status, builder);
  }
}
```

---

## 5. Cách sử dụng

```typescript
// Trong AttendanceService
import { AttendanceResponseFactory, AttendanceStatus } from '../factories/attendance-response.factory';

async checkInQR(studentId: string, dto: CheckInQRDto) {
  const result = await this.processCheckInLogic(studentId, dto);
  
  return AttendanceResponseFactory.create(result.status, result);
}

async approveAttendance(id: string, lecturerId: string) {
  const attendance = await this.prisma.attendance.update({...});
  return AttendanceResponseFactory.create(AttendanceStatus.APPROVED, { attendance });
}

async rejectAttendance(id: string, reason: string) {
  const attendance = await this.prisma.attendance.update({...});
  return AttendanceResponseFactory.create(AttendanceStatus.REJECTED, { attendance, reason });
}
```

---

## 6. Giải thích tại sao áp dụng Factory

### Vấn đề gặp phải:
- Logic tạo response lặp lại nhiều lần trong các method
- Khi cần thay đổi cấu trúc response, phải sửa nhiều nơi
- Khó thêm trạng thái mới mà không ảnh hưởng code hiện tại

### Giải pháp Factory:
- Tách logic tạo response ra từng Builder class riêng biệt
- Factory quản lý việc chọn Builder phù hợp
- Thêm trạng thái mới không cần sửa code cũ

---

## 7. Lợi ích của Factory Pattern

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

## 8. Sơ đồ Class

```mermaid
classDiagram
    class AttendanceResponseFactory {
        +static builders: Map~AttendanceStatus, AttendanceResponseBuilder~
        +static create(status, data): AttendanceResponse
        +static register(status, builder)
    }
    
    class <<interface>> AttendanceResponseBuilder {
        +build(data): AttendanceResponse
    }
    
    AttendanceResponseFactory --> AttendanceResponseBuilder
    
    AttendanceResponseBuilder <|.. ApprovedAttendanceBuilder
    AttendanceResponseBuilder <|.. PendingAttendanceBuilder
    AttendanceResponseBuilder <|.. RejectedAttendanceBuilder
    AttendanceResponseBuilder <|.. TooFarAttendanceBuilder
    AttendanceResponseBuilder <|.. AlreadyCheckedAttendanceBuilder
    
    class ApprovedAttendanceBuilder {
        +build(data): AttendanceResponse
    }
    
    class TooFarAttendanceBuilder {
        +build(data): AttendanceResponse
    }
```

---

## 9. Kết luận

Factory Pattern giúp quản lý việc tạo các đối tượng phức tạp một cách có tổ chức:

- ✅ Tách biệt logic khởi tạo khỏi business logic
- ✅ Dễ dàng thêm loại response mới
- ✅ Code gọn gàng, dễ bảo trì
- ✅ Dễ test từng thành phần

**Khuyến nghị:** Sử dụng Factory khi hệ thống có nhiều loại đối tượng cần tạo với logic khởi tạo phức tạp hoặc có thể thay đổi.

