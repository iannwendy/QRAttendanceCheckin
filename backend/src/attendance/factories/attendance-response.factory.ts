/**
 * FACTORY PATTERN - Attendance Response Factory
 * 
 * Bối cảnh: Hệ thống điểm danh có nhiều loại attendance response khác nhau:
 * - APPROVED: Điểm danh thành công
 * - PENDING: Chờ duyệt (OTP + ảnh)
 * - REJECTED: Bị từ chối
 * - TOO_FAR: Ngoài vùng GPS
 * - NOT_ATTENDED: Chưa điểm danh
 * 
 * Factory tạo ra các response object phù hợp với từng loại status
 */

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

