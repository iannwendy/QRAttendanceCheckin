import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CheckInQRDto } from './dto/checkin-qr.dto';
import { CheckInOTPDto } from './dto/checkin-otp.dto';
import { SessionsService } from '../sessions/sessions.service';
import { haversineDistance } from '../common/utils/geography.util';
import { authenticator } from 'otplib';
import { ConfigService } from '@nestjs/config';
import { EvidenceService } from '../evidence/evidence.service';
import { AttendanceMethod, AttendanceStatus } from '@prisma/client';

// Type declaration for Express.Multer.File
declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private sessionsService: SessionsService,
    private evidenceService: EvidenceService,
    private configService: ConfigService,
  ) {}

  async checkInQR(studentId: string, checkInDto: CheckInQRDto) {
    // Verify QR token - có thể là JWT signed hoặc JSON string
    let qrPayload = this.sessionsService.verifyQRToken(checkInDto.qrToken);

    // Nếu không phải JWT, thử parse JSON
    if (!qrPayload) {
      try {
        const parsed = JSON.parse(checkInDto.qrToken);
        if (parsed.sessionId && parsed.nonce) {
          // Validate payload manually
          const now = Math.floor(Date.now() / 1000);
          if (parsed.exp && parsed.exp >= now) {
            qrPayload = parsed;
          }
        }
      } catch {
        // Ignore
      }
    }

    // Cuối cùng, thử decode JWT payload không verify chữ ký (fallback demo)
    if (!qrPayload) {
      try {
        const parts = checkInDto.qrToken.split('.');
        if (parts.length === 3) {
          const json = Buffer.from(
            parts[1].replace(/-/g, '+').replace(/_/g, '/'),
            'base64',
          ).toString('utf8');
          const decoded = JSON.parse(json);
          const now = Math.floor(Date.now() / 1000);
          if (
            decoded &&
            decoded.sessionId &&
            decoded.exp &&
            decoded.exp >= now
          ) {
            qrPayload = decoded;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!qrPayload) {
      throw new BadRequestException('QR token không hợp lệ hoặc đã hết hạn');
    }

    const sessionId = qrPayload.sessionId;

    // Get session
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        class: {
          include: {
            students: {
              where: { studentId },
            },
          },
        },
      },
    });

    if (!session) {
      throw new BadRequestException('Buổi học không tồn tại');
    }

    // Check enrollment
    if (session.class.students.length === 0) {
      throw new UnauthorizedException('Bạn chưa đăng ký lớp này');
    }

    // Check GPS distance
    const distance = haversineDistance(
      checkInDto.lat,
      checkInDto.lng,
      session.latitude,
      session.longitude,
    );

    // Check if already has attendance record
    const existing = await this.prisma.attendance.findUnique({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId,
        },
      },
    });
    if (distance > session.geofenceRadius) {
      // Update or create TOO_FAR record
      if (existing) {
        if (existing.status === 'APPROVED') {
          return existing; // already approved, keep as is
        }
        return this.prisma.attendance.update({
          where: { id: existing.id },
          data: {
            method: AttendanceMethod.QR_GPS,
            status: 'TOO_FAR' as unknown as AttendanceStatus,
            lat: checkInDto.lat,
            lng: checkInDto.lng,
            accuracy: checkInDto.accuracy,
          },
        });
      } else {
        return this.prisma.attendance.create({
          data: {
            sessionId,
            studentId,
            method: AttendanceMethod.QR_GPS,
            status: 'TOO_FAR' as unknown as AttendanceStatus,
            lat: checkInDto.lat,
            lng: checkInDto.lng,
            accuracy: checkInDto.accuracy,
          },
        });
      }
    }

    // If within range
    if (existing) {
      if (existing.status === 'APPROVED') {
        return existing;
      }
      return this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          method: AttendanceMethod.QR_GPS,
          status: AttendanceStatus.APPROVED,
          lat: checkInDto.lat,
          lng: checkInDto.lng,
          accuracy: checkInDto.accuracy,
        },
      });
    }

    // No existing record -> create as approved
    return this.prisma.attendance.create({
      data: {
        sessionId,
        studentId,
        method: AttendanceMethod.QR_GPS,
        status: AttendanceStatus.APPROVED,
        lat: checkInDto.lat,
        lng: checkInDto.lng,
        accuracy: checkInDto.accuracy,
      },
    });
  }

  async checkInOTP(
    studentId: string,
    checkInDto: CheckInOTPDto,
    file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File ảnh là bắt buộc');
    }
    const identifier = checkInDto.sessionId.trim();
    let session = await this.prisma.session.findUnique({
      where: { id: identifier },
      include: {
        class: {
          include: {
            students: {
              where: { studentId },
            },
          },
        },
      },
    });

    if (!session) {
      session = await this.prisma.session.findFirst({
        where: { publicCode: identifier.toUpperCase() } as any,
        include: {
          class: {
            include: {
              students: {
                where: { studentId },
              },
            },
          },
        },
      });
    }

    if (!session) {
      throw new BadRequestException('Buổi học không tồn tại');
    }

    // Check enrollment
    if (session.class.students.length === 0) {
      throw new UnauthorizedException('Bạn chưa đăng ký lớp này');
    }

    // Verify TOTP
    const stepSeconds =
      parseInt(this.configService.get('OTP_STEP_SECONDS') || '30') || 30;
    authenticator.options = { step: stepSeconds, window: [1, 1] };
    const isValid = authenticator.check(checkInDto.otp, session.otpSecret);

    if (!isValid) {
      throw new BadRequestException('OTP không đúng hoặc đã hết hạn');
    }

    // Check if already checked in
    const existing = await this.prisma.attendance.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: session.id,
          studentId,
        },
      },
    });
    if (existing && existing.status === AttendanceStatus.APPROVED) {
      return existing;
    }

    // Upload photo
    const photoUrl = await this.evidenceService.uploadPhoto(file);

    let attendance;
    if (existing) {
      attendance = await this.prisma.attendance.update({
        where: { id: existing.id },
        data: {
          method: AttendanceMethod.OTP_PHOTO,
          status: AttendanceStatus.PENDING,
          otpUsed: checkInDto.otp,
        },
      });
    } else {
      attendance = await this.prisma.attendance.create({
        data: {
          sessionId: session.id,
          studentId,
          method: AttendanceMethod.OTP_PHOTO,
          status: AttendanceStatus.PENDING,
          otpUsed: checkInDto.otp,
        },
      });
    }

    // Create evidence
    await this.prisma.evidence.create({
      data: {
        attendanceId: attendance.id,
        photoUrl,
        metaJson: JSON.stringify(checkInDto.meta),
      },
    });

    return attendance;
  }

  async getSessionAttendances(sessionId: string) {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new BadRequestException('Buổi học không tồn tại');
    }

    return this.prisma.attendance.findMany({
      where: { sessionId },
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
      orderBy: [{ student: { studentCode: 'asc' } }, { updatedAt: 'desc' }],
    });
  }

  async approveAttendance(attendanceId: string) {
    const att = await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: { status: AttendanceStatus.APPROVED },
      include: { student: true, evidence: true },
    });
    return att;
  }

  async rejectAttendance(attendanceId: string) {
    const att = await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: { status: AttendanceStatus.REJECTED },
      include: { student: true, evidence: true },
    });
    return att;
  }

  async getClassAttendanceReport(classId: string) {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                studentCode: true,
                email: true,
              },
            },
          },
        },
        sessions: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
          },
          orderBy: { startTime: 'asc' },
        },
        lecturer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!classData) {
      throw new BadRequestException('Lớp học không tồn tại');
    }

    const totalSessions = classData.sessions.length;
    const report = [];

    for (const enrollment of classData.students) {
      const student = enrollment.student;

      // Get all attendances for this student in this class
      const attendances = await this.prisma.attendance.findMany({
        where: {
          studentId: student.id,
          sessionId: {
            in: classData.sessions.map((s) => s.id),
          },
        },
        include: {
          session: {
            select: {
              id: true,
              title: true,
              startTime: true,
            },
          },
        },
      });

      const approvedCount = attendances.filter(
        (a) => a.status === AttendanceStatus.APPROVED,
      ).length;
      const attendanceRate =
        totalSessions > 0 ? (approvedCount / totalSessions) * 100 : 0;

      // Build session attendance details
      const sessionDetails = classData.sessions.map((session) => {
        const attendance = attendances.find((a) => a.sessionId === session.id);
        return {
          sessionId: session.id,
          sessionTitle: session.title,
          sessionDate: session.startTime,
          status: attendance?.status || AttendanceStatus.NOT_ATTENDED,
          method: attendance?.method || null,
          checkedInAt: attendance?.updatedAt || null,
        };
      });

      report.push({
        studentId: student.id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        email: student.email,
        totalSessions,
        attendedSessions: approvedCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        sessionDetails,
      });
    }

    return {
      class: {
        id: classData.id,
        code: classData.code,
        name: classData.name,
        lecturer: classData.lecturer
          ? {
              id: classData.lecturer.id,
              fullName: classData.lecturer.fullName,
              email: classData.lecturer.email,
            }
          : null,
      },
      totalSessions,
      totalStudents: classData.students.length,
      report,
    };
  }

  async getAllClassesAttendanceReport() {
    const classes = await this.prisma.class.findMany({
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                studentCode: true,
                email: true,
              },
            },
          },
        },
        sessions: {
          select: {
            id: true,
            title: true,
            startTime: true,
          },
          orderBy: { startTime: 'asc' },
        },
        lecturer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const allReports = [];

    for (const classData of classes) {
      const totalSessions = classData.sessions.length;
      const classReport = [];

      for (const enrollment of classData.students) {
        const student = enrollment.student;

        const attendances = await this.prisma.attendance.findMany({
          where: {
            studentId: student.id,
            sessionId: {
              in: classData.sessions.map((s) => s.id),
            },
          },
        });

        const approvedCount = attendances.filter(
          (a) => a.status === AttendanceStatus.APPROVED,
        ).length;
        const attendanceRate =
          totalSessions > 0 ? (approvedCount / totalSessions) * 100 : 0;

        classReport.push({
          studentId: student.id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          email: student.email,
          totalSessions,
          attendedSessions: approvedCount,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
        });
      }

      allReports.push({
        class: {
          id: classData.id,
          code: classData.code,
          name: classData.name,
          lecturer: classData.lecturer
            ? {
                id: classData.lecturer.id,
                fullName: classData.lecturer.fullName,
                email: classData.lecturer.email,
              }
            : null,
        },
        totalSessions,
        totalStudents: classData.students.length,
        students: classReport,
      });
    }

    return allReports;
  }

  async getAttendanceAnalyticsOverview() {
    const now = new Date();
    const [allReports, liveSessions] = await Promise.all([
      this.getAllClassesAttendanceReport(),
      this.prisma.session.findMany({
        where: {
          startTime: { lte: now },
          endTime: { gte: now },
        },
        include: {
          class: {
            select: {
              id: true,
              code: true,
              name: true,
              lecturer: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
          attendances: {
            select: {
              status: true,
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const classStats = allReports.map((classReport) => {
      const totalStudents = classReport.students.length;
      const totalAttendanceRate = classReport.students.reduce(
        (sum, student) => sum + (student.attendanceRate || 0),
        0,
      );
      const avgAttendance =
        totalStudents > 0 ? totalAttendanceRate / totalStudents : 0;

      return {
        classId: classReport.class.id,
        classCode: classReport.class.code,
        className: classReport.class.name,
        lecturer: classReport.class.lecturer,
        totalSessions: classReport.totalSessions,
        totalStudents: classReport.totalStudents,
        averageAttendance: Math.round(avgAttendance * 100) / 100,
      };
    });

    const lecturerMap = new Map<
      string,
      {
        lecturerId: string | null;
        lecturerName: string;
        lecturerEmail: string | null;
        totalClasses: number;
        totalStudents: number;
        cumulativeAttendance: number;
      }
    >();

    classStats.forEach((stat) => {
      const key = stat.lecturer?.id || 'unassigned';
      if (!lecturerMap.has(key)) {
        lecturerMap.set(key, {
          lecturerId: stat.lecturer?.id || null,
          lecturerName: stat.lecturer?.fullName || 'Chưa gán',
          lecturerEmail: stat.lecturer?.email || null,
          totalClasses: 0,
          totalStudents: 0,
          cumulativeAttendance: 0,
        });
      }
      const bucket = lecturerMap.get(key)!;
      bucket.totalClasses += 1;
      bucket.totalStudents += stat.totalStudents;
      bucket.cumulativeAttendance += stat.averageAttendance;
    });

    const lecturerStats = Array.from(lecturerMap.values())
      .map((bucket) => ({
        lecturerId: bucket.lecturerId,
        lecturerName: bucket.lecturerName,
        lecturerEmail: bucket.lecturerEmail,
        totalClasses: bucket.totalClasses,
        totalStudents: bucket.totalStudents,
        averageAttendance:
          bucket.totalClasses > 0
            ? Math.round(
                (bucket.cumulativeAttendance / bucket.totalClasses) * 100,
              ) / 100
            : 0,
      }))
      .sort((a, b) => b.averageAttendance - a.averageAttendance);

    const liveSessionStats = liveSessions.map((session) => {
      const approved = session.attendances.filter(
        (a) => a.status === AttendanceStatus.APPROVED,
      ).length;
      const pending = session.attendances.filter(
        (a) => a.status === AttendanceStatus.PENDING,
      ).length;
      const rejected = session.attendances.filter(
        (a) => a.status === AttendanceStatus.REJECTED,
      ).length;
      const total = session.attendances.length;
      const notCheckedIn = Math.max(total - approved - pending - rejected, 0);
      const attendanceRate = total > 0 ? Math.round((approved / total) * 100) : 0;

      return {
        sessionId: session.id,
        title: session.title,
        startTime: session.startTime,
        endTime: session.endTime,
        class: session.class,
        approved,
        pending,
        rejected,
        notCheckedIn,
        total,
        attendanceRate,
      };
    });

    const summaryAverage =
      classStats.length > 0
        ? Math.round(
            (classStats.reduce((sum, item) => sum + item.averageAttendance, 0) /
              classStats.length) *
              100,
          ) / 100
        : 0;

    return {
      summary: {
        totalClasses: classStats.length,
        activeLecturers: lecturerStats.filter((lec) => lec.lecturerId).length,
        averageAttendance: summaryAverage,
        liveSessions: liveSessionStats.length,
      },
      classStats,
      lecturerStats,
      liveSessions: liveSessionStats,
    };
  }
}
