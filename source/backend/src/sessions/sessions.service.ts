import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { authenticator } from 'otplib';
import { QRTokenService } from '../common/utils/qr-token.util';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { SessionBuilderDirector } from './builders/session.builder';
import { QuickCreateSessionDto } from './dto/quick-create-session.dto';

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private sessionBuilderDirector: SessionBuilderDirector,
    private qrTokenService: QRTokenService,
  ) {}

  async create(createSessionDto: CreateSessionDto) {
    const result = await this.sessionBuilderDirector.buildStandardSession(createSessionDto);
    return result.session;
  }

  async createQuick(quickCreateSessionDto: QuickCreateSessionDto) {
    const result = await this.sessionBuilderDirector.buildQuickSession(quickCreateSessionDto);
    return result.session;
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
