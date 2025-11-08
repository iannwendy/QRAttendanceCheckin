import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { authenticator } from 'otplib';
import { QRTokenService } from '../common/utils/qr-token.util';
import { JwtService } from '@nestjs/jwt';
import { AttendanceMethod, AttendanceStatus, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionsService {
  private qrTokenService: QRTokenService;
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.qrTokenService = new QRTokenService(
      this.jwtService,
      this.configService,
    );
  }

  async create(createSessionDto: CreateSessionDto) {
    const otpSecret = authenticator.generateSecret();
    const rawCode = (createSessionDto.publicCode || '').trim().toUpperCase();
    if (!rawCode) {
      throw new BadRequestException('Mã buổi là bắt buộc');
    }

    const conflict = await this.prisma.session.findFirst({
      where: { publicCode: rawCode } as any,
      select: { id: true },
    });
    if (conflict) {
      throw new BadRequestException('Mã buổi đã tồn tại, vui lòng chọn mã khác');
    }

    const session = await this.prisma.session.create({
      data: {
        classId: createSessionDto.classId,
        title: createSessionDto.title,
        startTime: new Date(createSessionDto.startTime),
        endTime: new Date(createSessionDto.endTime),
        latitude: createSessionDto.latitude,
        longitude: createSessionDto.longitude,
        geofenceRadius: createSessionDto.geofenceRadius,
        otpSecret,
        publicCode: rawCode,
      } as any,
    });

    // Auto import 100 students 523H0001 - 523H0100 into the class and seed NOT_ATTENDED records
    const toPadded = (n: number) => n.toString().padStart(4, '0');
    const studentCodes = Array.from(
      { length: 100 },
      (_, i) => `523H${toPadded(i + 1)}`,
    );

    // Fetch existing users by studentCode
    const existingUsers = await this.prisma.user.findMany({
      where: { studentCode: { in: studentCodes } },
      select: { id: true, studentCode: true },
    });
    const existingCodeSet = new Set(
      existingUsers.map((u) => u.studentCode as string),
    );

    // Create missing users with basic placeholders
    const missingCodes = studentCodes.filter(
      (code) => !existingCodeSet.has(code),
    );
    if (missingCodes.length > 0) {
      await this.prisma.user.createMany({
        data: missingCodes.map((code, idx) => ({
          email: `${code.toLowerCase()}@example.edu`,
          passwordHash: '',
          fullName: `Sinh viên ${code}`,
          studentCode: code,
          role: 'STUDENT',
        })),
        skipDuplicates: true,
      });
    }

    // Re-fetch all users to get ids
    const allUsers = await this.prisma.user.findMany({
      where: { studentCode: { in: studentCodes } },
      select: { id: true, studentCode: true },
    });
    const codeToUserId = new Map(
      allUsers.map((u) => [u.studentCode as string, u.id]),
    );

    // Ensure enrollments into the class
    const enrollData = allUsers.map((u) => ({
      classId: session.classId,
      studentId: u.id,
    }));
    await this.prisma.enrollment.createMany({
      data: enrollData,
      skipDuplicates: true,
    });

    // Seed attendance placeholders for this session
    const attendanceData = allUsers.map((u) => ({
      sessionId: session.id,
      studentId: u.id,
      method: 'AUTO_IMPORT' as unknown as AttendanceMethod,
      status: 'NOT_ATTENDED' as unknown as AttendanceStatus,
    }));
    await this.prisma.attendance.createMany({
      data: attendanceData,
      skipDuplicates: true,
    });

    return session;
  }


  async findOne(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: {
        class: true,
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                fullName: true,
                studentCode: true,
              },
            },
            evidence: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Buổi học không tồn tại');
    }

    return session;
  }

  async findByPublicCode(code: string) {
    const normalized = code.trim().toUpperCase();
    const session = await this.prisma.session.findFirst({
      where: { publicCode: normalized } as any,
      include: {
        class: true,
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                email: true,
                fullName: true,
                studentCode: true,
              },
            },
            evidence: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Buổi học không tồn tại');
    }

    return session;
  }

  async update(id: string, dto: any) {
    const exists = await this.prisma.session.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Buổi học không tồn tại');

    const data: Prisma.SessionUncheckedUpdateInput = {} as any;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.startTime !== undefined)
      data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;
    if (dto.geofenceRadius !== undefined) data.geofenceRadius = dto.geofenceRadius;

    if (dto.publicCode !== undefined) {
      const code = String(dto.publicCode || '').trim().toUpperCase();
      if (!code) {
        throw new BadRequestException('Mã buổi không được để trống');
      }
      const conflict = await this.prisma.session.findFirst({
        where: { publicCode: code, NOT: { id } } as any,
        select: { id: true },
      });
      if (conflict) {
        throw new BadRequestException('Mã buổi đã tồn tại, vui lòng chọn mã khác');
      }
      (data as any).publicCode = code;
    }

    return this.prisma.session.update({ where: { id }, data });
  }

  async remove(id: string) {
    const session = await this.prisma.session.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!session) {
      throw new NotFoundException('Buổi học không tồn tại');
    }

    await this.prisma.session.delete({ where: { id } });
    return { success: true };
  }

  async removeByPublicCode(code: string) {
    const normalized = code.trim().toUpperCase();
    const found = await this.prisma.session.findFirst({
      where: { publicCode: normalized } as any,
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('Buổi học không tồn tại');
    }
    await this.prisma.session.delete({ where: { id: found.id } });
    return { success: true };
  }

  async getQRToken(sessionId: string): Promise<string> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Buổi học không tồn tại');
    }

    const payload = this.qrTokenService.generateQRToken(session);
    return this.qrTokenService.signQRToken(payload);
  }

  async getQRPayload(sessionId: string): Promise<any> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Buổi học không tồn tại');
    }

    return this.qrTokenService.generateQRToken(session);
  }

  async getOTP(sessionId: string): Promise<string> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Buổi học không tồn tại');
    }

    const stepSeconds =
      parseInt(this.configService.get('OTP_STEP_SECONDS') || '60') || 60;
    authenticator.options = { step: stepSeconds };
    const token = authenticator.generate(session.otpSecret);

    return token;
  }

  verifyQRToken(token: string) {
    return this.qrTokenService.verifyQRToken(token);
  }
}
