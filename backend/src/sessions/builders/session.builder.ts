/**
 * BUILDER PATTERN - Session Creation Builder
 * 
 * Bối cảnh: Việc tạo một Session trong hệ thống có nhiều bước phức tạp:
 * 1. Validate thông tin đầu vào
 * 2. Tạo OTP secret
 * 3. Kiểm tra mã buổi trùng lặp
 * 4. Tạo session trong database
 * 5. Auto-import sinh viên vào lớp
 * 6. Tạo attendance placeholders
 * 
 * Builder pattern giúp tách rời việc xây dựng đối tượng phức tạp này
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSessionDto } from '../sessions/dto/create-session.dto';

export interface SessionBuildResult {
  session: any;
  studentCount: number;
  autoEnrolled: boolean;
}

/**
 * Director - Quản lý quy trình build
 */
@Injectable()
export class SessionBuilderDirector {
  constructor(private prisma: PrismaService) {}

  /**
   * Xây dựng session hoàn chỉnh
   */
  async build(dto: CreateSessionDto): Promise<SessionBuildResult> {
    // Bước 1: Validate và tạo DTO builder
    const builder = new SessionBuilder(this.prisma);
    builder.setBasicInfo(dto);
    
    // Bước 2: Generate OTP
    builder.generateOTP();
    
    // Bước 3: Validate mã buổi
    await builder.validatePublicCode();
    
    // Bước 4: Build session
    const session = await builder.build();
    
    // Bước 5: Auto-enroll students
    const studentCount = await builder.autoEnrollStudents();
    
    return {
      session,
      studentCount,
      autoEnrolled: true,
    };
  }
}

/**
 * Builder - Xây dựng từng phần của Session
 */
class SessionBuilder {
  private dto: CreateSessionDto;
  private otpSecret: string;
  private rawCode: string;
  private session: any;
  
  constructor(private prisma: PrismaService) {}

  /**
   * Thiết lập thông tin cơ bản
   */
  setBasicInfo(dto: CreateSessionDto): void {
    this.dto = dto;
    this.rawCode = (dto.publicCode || '').trim().toUpperCase();
    
    if (!this.rawCode) {
      throw new BadRequestException('Mã buổi là bắt buộc');
    }
  }

  /**
   * Sinh mã OTP
   */
  generateOTP(): void {
    this.otpSecret = authenticator.generateSecret();
  }

  /**
   * Validate mã buổi không trùng lặp
   */
  async validatePublicCode(): Promise<void> {
    const conflict = await this.prisma.session.findFirst({
      where: { publicCode: this.rawCode } as any,
      select: { id: true },
    });
    
    if (conflict) {
      throw new BadRequestException('Mã buổi đã tồn tại, vui lòng chọn mã khác');
    }
  }

  /**
   * Build session vào database
   */
  async build(): Promise<any> {
    this.session = await this.prisma.session.create({
      data: {
        classId: this.dto.classId,
        title: this.dto.title,
        startTime: new Date(this.dto.startTime),
        endTime: new Date(this.dto.endTime),
        latitude: this.dto.latitude,
        longitude: this.dto.longitude,
        geofenceRadius: this.dto.geofenceRadius,
        otpSecret: this.otpSecret,
        publicCode: this.rawCode,
      } as any,
    });
    
    return this.session;
  }

  /**
   * Tự động đăng ký sinh viên và tạo attendance placeholders
   */
  async autoEnrollStudents(): Promise<number> {
    // Tạo danh sách mã sinh viên mẫu
    const toPadded = (n: number) => n.toString().padStart(4, '0');
    const studentCodes = Array.from(
      { length: 100 },
      (_, i) => `523H${toPadded(i + 1)}`,
    );

    // Lấy users hiện có
    const existingUsers = await this.prisma.user.findMany({
      where: { studentCode: { in: studentCodes } },
      select: { id: true, studentCode: true },
    });
    
    const existingCodeSet = new Set(
      existingUsers.map((u) => u.studentCode as string),
    );

    // Tạo users còn thiếu
    const missingCodes = studentCodes.filter(
      (code) => !existingCodeSet.has(code),
    );
    
    if (missingCodes.length > 0) {
      await this.prisma.user.createMany({
        data: missingCodes.map((code) => ({
          email: `${code.toLowerCase()}@example.edu`,
          passwordHash: '',
          fullName: `Sinh viên ${code}`,
          studentCode: code,
          role: 'STUDENT',
        })),
        skipDuplicates: true,
      });
    }

    // Lấy lại tất cả users
    const allUsers = await this.prisma.user.findMany({
      where: { studentCode: { in: studentCodes } },
      select: { id: true, studentCode: true },
    });

    // Đăng ký vào lớp
    const enrollData = allUsers.map((u) => ({
      classId: this.session.classId,
      studentId: u.id,
    }));
    await this.prisma.enrollment.createMany({
      data: enrollData,
      skipDuplicates: true,
    });

    // Tạo attendance placeholders
    const attendanceData = allUsers.map((u) => ({
      sessionId: this.session.id,
      studentId: u.id,
      method: 'AUTO_IMPORT' as any,
      status: 'NOT_ATTENDED' as any,
    }));
    await this.prisma.attendance.createMany({
      data: attendanceData,
      skipDuplicates: true,
    });

    return allUsers.length;
  }
}

