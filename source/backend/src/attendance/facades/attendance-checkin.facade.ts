/**
 * FACADE PATTERN - Attendance Check-in Facade
 *
 * Bối cảnh: Quy trình check-in QR có nhiều bước phức tạp:
 * 1. Verify QR token (nhiều định dạng) - Sử dụng ADAPTER PATTERN
 * 2. Validate session tồn tại
 * 3. Kiểm tra sinh viên đã đăng ký lớp chưa
 * 4. Tính khoảng cách GPS
 * 5. Tạo/cập nhật attendance record
 *
 * Facade cung cấp interface đơn giản hóa cho client, ẩn đi sự phức tạp bên trong
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QRTokenPayload, QRTokenAdapterManager } from '../../common/utils/qr-token-adapter';
import { haversineDistance } from '../../common/utils/geography.util';
import { AttendanceMethod, AttendanceStatus } from '@prisma/client';

export interface CheckInResult {
  success: boolean;
  status: AttendanceStatus;
  message: string;
  attendance?: any;
}

/**
 * Facade đơn giản hóa toàn bộ quy trình check-in QR
 * Sử dụng ADAPTER PATTERN để parse QR token với nhiều định dạng
 */
@Injectable()
export class AttendanceCheckInFacade {
  constructor(
    private prisma: PrismaService,
    private qrTokenAdapterManager: QRTokenAdapterManager,
  ) {}

  /**
   * Check-in đơn giản hóa - Client chỉ cần gọi một method
   */
  async processCheckIn(
    qrToken: string,
    lat: number,
    lng: number,
    _accuracy?: number,
  ): Promise<CheckInResult> {
    // Bước 1: Verify và parse QR token - SỬ DỤNG ADAPTER PATTERN
    let qrPayload: QRTokenPayload | null;
    try {
      qrPayload = this.qrTokenAdapterManager.parse(qrToken);
    } catch {
      qrPayload = null;
    }

    if (!qrPayload) {
      return {
        success: false,
        status: AttendanceStatus.REJECTED,
        message: 'QR token không hợp lệ hoặc đã hết hạn',
      };
    }

    // Bước 2: Lấy session
    const session = await this.getSession(qrPayload.sessionId);
    if (!session) {
      return {
        success: false,
        status: AttendanceStatus.REJECTED,
        message: 'Buổi học không tồn tại',
      };
    }

    // Bước 3: Kiểm tra enrollment (sẽ được kiểm tra sau khi có studentId)

    // Bước 4: Tính khoảng cách GPS
    const distance = haversineDistance(
      lat,
      lng,
      session.latitude,
      session.longitude,
    );

    const isInGeofence = distance <= session.geofenceRadius;

    // Bước 5: Tạo kết quả
    return {
      success: isInGeofence,
      status: isInGeofence ? AttendanceStatus.APPROVED : AttendanceStatus.TOO_FAR,
      message: isInGeofence
        ? 'Điểm danh thành công'
        : `Bạn đang cách ${Math.round(distance)}m - vượt quá giới hạn ${session.geofenceRadius}m`,
    };
  }

  /**
   * Lấy session từ database
   */
  private async getSession(sessionId: string) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          include: {
            students: true,
          },
        },
      },
    });
  }

  /**
   * Check-in hoàn chỉnh với studentId
   * Sử dụng ADAPTER PATTERN để parse QR token
   */
  async completeCheckIn(
    studentId: string,
    qrToken: string,
    lat: number,
    lng: number,
    _accuracy?: number,
  ): Promise<CheckInResult> {
    // Parse và lấy session - SỬ DỤNG ADAPTER PATTERN
    let qrPayload: QRTokenPayload | null;
    try {
      qrPayload = this.qrTokenAdapterManager.parse(qrToken);
    } catch {
      qrPayload = null;
    }

    if (!qrPayload) {
      throw new BadRequestException('QR token không hợp lệ hoặc đã hết hạn');
    }

    const session = await this.getSession(qrPayload.sessionId);
    if (!session) {
      throw new BadRequestException('Buổi học không tồn tại');
    }

    // Kiểm tra enrollment
    const isEnrolled = session.class.students.some(
      (s: { studentId: string }) => s.studentId === studentId,
    );
    if (!isEnrolled) {
      throw new BadRequestException('Bạn chưa đăng ký lớp này');
    }

    // Tính khoảng cách
    const distance = haversineDistance(
      lat,
      lng,
      session.latitude,
      session.longitude,
    );

    const isInGeofence = distance <= session.geofenceRadius;

    // Kiểm tra attendance hiện có
    const existing = await this.prisma.attendance.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId,
        },
      },
    });

    // Tạo hoặc cập nhật attendance
    let attendance;
    if (existing) {
      if (existing.status === AttendanceStatus.APPROVED) {
        return {
          success: true,
          status: existing.status,
          message: 'Đã điểm danh trước đó',
          attendance: existing,
        };
      }

      attendance = await this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          method: AttendanceMethod.QR_GPS,
          status: isInGeofence ? AttendanceStatus.APPROVED : AttendanceStatus.TOO_FAR,
          lat,
          lng,
        },
      });
    } else {
      attendance = await this.prisma.attendance.create({
        data: {
          sessionId: session.id,
          studentId,
          method: AttendanceMethod.QR_GPS,
          status: isInGeofence ? AttendanceStatus.APPROVED : AttendanceStatus.TOO_FAR,
          lat,
          lng,
        },
      });
    }

    return {
      success: isInGeofence,
      status: attendance.status,
      message: isInGeofence
        ? 'Điểm danh thành công'
        : 'Bạn đang ở ngoài vùng điểm danh',
      attendance,
    };
  }
}
