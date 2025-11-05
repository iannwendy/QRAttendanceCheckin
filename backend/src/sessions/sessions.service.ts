import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { authenticator } from 'otplib';
import { QRTokenService } from '../common/utils/qr-token.util';
import { JwtService } from '@nestjs/jwt';
import { AttendanceMethod, AttendanceStatus } from '@prisma/client';
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
    // Tạo OTP secret ngẫu nhiên
    const otpSecret = authenticator.generateSecret();
    const session = await this.prisma.session.create({
      data: {
        ...createSessionDto,
        otpSecret,
      },
    });

    // Auto import 100 students 523H0001 - 523H0100 into the class and seed NOT_ATTENDED records
    const toPadded = (n: number) => n.toString().padStart(4, '0');
    const studentCodes = Array.from({ length: 100 }, (_, i) => `523H${toPadded(i + 1)}`);

    // Fetch existing users by studentCode
    const existingUsers = await this.prisma.user.findMany({
      where: { studentCode: { in: studentCodes } },
      select: { id: true, studentCode: true },
    });
    const existingCodeSet = new Set(existingUsers.map((u) => u.studentCode as string));

    // Create missing users with basic placeholders
    const missingCodes = studentCodes.filter((code) => !existingCodeSet.has(code));
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
    const codeToUserId = new Map(allUsers.map((u) => [u.studentCode as string, u.id]));

    // Ensure enrollments into the class
    const enrollData = allUsers.map((u) => ({ classId: session.classId, studentId: u.id }));
    await this.prisma.enrollment.createMany({ data: enrollData, skipDuplicates: true });

    // Seed attendance placeholders for this session
    const attendanceData = allUsers.map((u) => ({
      sessionId: session.id,
      studentId: u.id,
      method: 'AUTO_IMPORT' as unknown as AttendanceMethod,
      status: 'NOT_ATTENDED' as unknown as AttendanceStatus,
    }));
    await this.prisma.attendance.createMany({ data: attendanceData, skipDuplicates: true });

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

  async getQRToken(sessionId: string): Promise<string> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Buổi học không tồn tại');
    }

    const payload = this.qrTokenService.generateQRToken(sessionId);
    return this.qrTokenService.signQRToken(payload);
  }

  async getQRPayload(sessionId: string): Promise<any> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Buổi học không tồn tại');
    }

    const payload = this.qrTokenService.generateQRToken(sessionId);
    return payload;
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

