/**
 * FACADE PATTERN - Attendance Check-in Facade
 * 
 * Bối cảnh: Quy trình check-in QR có nhiều bước phức tạp:
 * 1. Verify QR token (nhiều định dạng)
 * 2. Validate session tồn tại
 * 3. Kiểm tra sinh viên đã đăng ký lớp chưa
 * 4. Tính khoảng cách GPS
 * 5. Tạo/cập nhật attendance record
 * 
 * Facade cung cấp interface đơn giản hóa cho client, ẩn đi sự phức tạp bên trong
 */

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

/**
 * Facade đơn giản hóa toàn bộ quy trình check-in QR
 */
@Injectable()
export class AttendanceCheckInFacade {
  constructor(
    private prisma: PrismaService,
    private qrTokenService: QRTokenService,
  ) {}

  /**
   * Check-in đơn giản hóa - Client chỉ cần gọi một method
   */
  async processCheckIn(
    qrToken: string,
    lat: number,
    lng: number,
    accuracy?: number,
  ): Promise<CheckInResult> {
    // Bước 1: Verify và parse QR token
    const qrPayload = this.parseQRToken(qrToken);
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
      } catch {
        // Ignore
      }
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
      } catch {
        // ignore
      }
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
          accuracy,
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
          accuracy,
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

