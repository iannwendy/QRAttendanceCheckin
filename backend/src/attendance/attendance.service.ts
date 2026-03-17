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
import {
  AttendanceEvent,
  AttendanceSubject,
} from './observers/attendance-observer';
import { Cached, invalidateCache } from '../common/decorators/cache-decorator';
import { AttendanceCheckInFacade } from './facades/attendance-checkin.facade';
import { AttendanceResponseFactory } from './factories/attendance-response.factory';

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
    private subject: AttendanceSubject,
    private checkInFacade: AttendanceCheckInFacade,
  ) {}
  private async publishAttendanceEvent(
    event: Omit<AttendanceEvent, 'timestamp'> & { timestamp?: Date },
  ) {
    await this.subject.notify({
      ...event,
      timestamp: event.timestamp ?? new Date(),
    });
  }

  private invalidateAttendanceCaches() {
    invalidateCache('AttendanceService:.*Report');
    invalidateCache('AttendanceService:.*Analytics');
  }

  async checkInQR(studentId: string, checkInDto: CheckInQRDto) {
    // Use Facade to process check-in
    const checkInResult = await this.checkInFacade.completeCheckIn(
      studentId,
      checkInDto.qrToken,
      checkInDto.lat,
      checkInDto.lng,
      checkInDto.accuracy,
    );

    // Publish observer event
    if (checkInResult.attendance) {
      await this.publishAttendanceEvent({
        attendanceId: checkInResult.attendance.id,
        studentId,
        sessionId: checkInResult.attendance.sessionId,
        oldStatus: null,
        newStatus: checkInResult.attendance.status,
        method: AttendanceMethod.QR_GPS,
      });
      this.invalidateAttendanceCaches();
    }

    // Use Factory to create response
    if (checkInResult.attendance) {
      return AttendanceResponseFactory.create(
        checkInResult.attendance.status,
        checkInResult.attendance,
      );
    }

    return AttendanceResponseFactory.create(checkInResult.status, {
      status: checkInResult.status,
      message: checkInResult.message,
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
        class: { include: { students: { where: { studentId } } } },
      },
    });

    if (!session) {
      session = await this.prisma.session.findFirst({
        where: { publicCode: identifier.toUpperCase() } as any,
        include: {
          class: { include: { students: { where: { studentId } } } },
        },
      });
    }

    if (!session) {
      throw new BadRequestException('Buổi học không tồn tại');
    }
    if (session.class.students.length === 0) {
      throw new UnauthorizedException('Bạn chưa đăng ký lớp này');
    }

    const stepSeconds =
      parseInt(this.configService.get('OTP_STEP_SECONDS') || '30') || 30;
    authenticator.options = { step: stepSeconds, window: [1, 1] };
    const isValid = authenticator.check(checkInDto.otp, session.otpSecret);
    if (!isValid) {
      throw new BadRequestException('OTP không đúng hoặc đã hết hạn');
    }

    const existing = await this.prisma.attendance.findUnique({
      where: { sessionId_studentId: { sessionId: session.id, studentId } },
    });
    if (existing && existing.status === AttendanceStatus.APPROVED) {
      return AttendanceResponseFactory.create(existing.status, existing);
    }

    const photoUrl = await this.evidenceService.uploadPhoto(file);
    const oldStatus = existing?.status ?? null;
    let attendance;
    if (existing) {
      attendance = await this.prisma.attendance.update({
        where: { id: existing.id },
        data: { method: AttendanceMethod.OTP_PHOTO, status: AttendanceStatus.PENDING, otpUsed: checkInDto.otp },
      });
    } else {
      attendance = await this.prisma.attendance.create({
        data: { sessionId: session.id, studentId, method: AttendanceMethod.OTP_PHOTO, status: AttendanceStatus.PENDING, otpUsed: checkInDto.otp },
      });
    }

    await this.prisma.evidence.create({
      data: { attendanceId: attendance.id, photoUrl, metaJson: JSON.stringify(checkInDto.meta) },
    });

    await this.publishAttendanceEvent({
      attendanceId: attendance.id, studentId, sessionId: session.id,
      oldStatus, newStatus: AttendanceStatus.PENDING, method: AttendanceMethod.OTP_PHOTO,
    });
    this.invalidateAttendanceCaches();

    return AttendanceResponseFactory.create(attendance.status, attendance);
  }
  async getSessionAttendances(sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) { throw new BadRequestException('Buổi học không tồn tại'); }
    return this.prisma.attendance.findMany({
      where: { sessionId },
      include: {
        student: { select: { id: true, email: true, fullName: true, studentCode: true } },
        evidence: true,
      },
      orderBy: [{ student: { studentCode: 'asc' } }, { updatedAt: 'desc' }],
    });
  }

  async approveAttendance(attendanceId: string) {
    const [existing, att] = await this.prisma.$transaction([
      this.prisma.attendance.findUnique({ where: { id: attendanceId }, select: { status: true } }),
      this.prisma.attendance.update({
        where: { id: attendanceId },
        data: { status: AttendanceStatus.APPROVED },
        include: { student: true, evidence: true },
      }),
    ]);
    await this.publishAttendanceEvent({
      attendanceId: att.id, studentId: att.studentId, sessionId: att.sessionId,
      oldStatus: existing?.status ?? null, newStatus: AttendanceStatus.APPROVED, method: att.method,
    });
    this.invalidateAttendanceCaches();
    return AttendanceResponseFactory.create(att.status, att);
  }

  async rejectAttendance(attendanceId: string) {
    const [existing, att] = await this.prisma.$transaction([
      this.prisma.attendance.findUnique({ where: { id: attendanceId }, select: { status: true } }),
      this.prisma.attendance.update({
        where: { id: attendanceId },
        data: { status: AttendanceStatus.REJECTED },
        include: { student: true, evidence: true },
      }),
    ]);
    await this.publishAttendanceEvent({
      attendanceId: att.id, studentId: att.studentId, sessionId: att.sessionId,
      oldStatus: existing?.status ?? null, newStatus: AttendanceStatus.REJECTED, method: att.method,
    });
    this.invalidateAttendanceCaches();
    return AttendanceResponseFactory.create(att.status, att);
  }
  @Cached(120)
  async getClassAttendanceReport(classId: string) {
    const classData = await this.prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: { include: { student: { select: { id: true, fullName: true, studentCode: true, email: true } } } },
        sessions: { select: { id: true, title: true, startTime: true, endTime: true }, orderBy: { startTime: 'asc' } },
        lecturer: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!classData) { throw new BadRequestException('Lớp học không tồn tại'); }

    const totalSessions = classData.sessions.length;
    const report = [];
    for (const enrollment of classData.students) {
      const student = enrollment.student;
      const attendances = await this.prisma.attendance.findMany({
        where: { studentId: student.id, sessionId: { in: classData.sessions.map((s) => s.id) } },
        include: { session: { select: { id: true, title: true, startTime: true } } },
      });
      const approvedCount = attendances.filter((a) => a.status === AttendanceStatus.APPROVED).length;
      const attendanceRate = totalSessions > 0 ? (approvedCount / totalSessions) * 100 : 0;
      const sessionDetails = classData.sessions.map((session) => {
        const attendance = attendances.find((a) => a.sessionId === session.id);
        return {
          sessionId: session.id, sessionTitle: session.title, sessionDate: session.startTime,
          status: attendance?.status || AttendanceStatus.NOT_ATTENDED,
          method: attendance?.method || null, checkedInAt: attendance?.updatedAt || null,
        };
      });
      report.push({
        studentId: student.id, studentCode: student.studentCode, fullName: student.fullName,
        email: student.email, totalSessions, attendedSessions: approvedCount,
        attendanceRate: Math.round(attendanceRate * 100) / 100, sessionDetails,
      });
    }
    return {
      class: {
        id: classData.id, code: classData.code, name: classData.name,
        lecturer: classData.lecturer ? { id: classData.lecturer.id, fullName: classData.lecturer.fullName, email: classData.lecturer.email } : null,
      },
      totalSessions, totalStudents: classData.students.length, report,
    };
  }
  @Cached(60)
  async getAllClassesAttendanceReport() {
    const classes = await this.prisma.class.findMany({
      include: {
        students: { include: { student: { select: { id: true, fullName: true, studentCode: true, email: true } } } },
        sessions: { select: { id: true, title: true, startTime: true }, orderBy: { startTime: 'asc' } },
        lecturer: { select: { id: true, fullName: true, email: true } },
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
          where: { studentId: student.id, sessionId: { in: classData.sessions.map((s) => s.id) } },
        });
        const approvedCount = attendances.filter((a) => a.status === AttendanceStatus.APPROVED).length;
        const attendanceRate = totalSessions > 0 ? (approvedCount / totalSessions) * 100 : 0;
        classReport.push({
          studentId: student.id, studentCode: student.studentCode, fullName: student.fullName,
          email: student.email, totalSessions, attendedSessions: approvedCount,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
        });
      }
      allReports.push({
        class: {
          id: classData.id, code: classData.code, name: classData.name,
          lecturer: classData.lecturer ? { id: classData.lecturer.id, fullName: classData.lecturer.fullName, email: classData.lecturer.email } : null,
        },
        totalSessions, totalStudents: classData.students.length, students: classReport,
      });
    }
    return allReports;
  }

  @Cached(60)
  async getAttendanceAnalyticsOverview() {
    const now = new Date();
    const [allReports, liveSessions] = await Promise.all([
      this.getAllClassesAttendanceReport(),
      this.prisma.session.findMany({
        where: { startTime: { lte: now }, endTime: { gte: now } },
        include: {
          class: { select: { id: true, code: true, name: true, lecturer: { select: { id: true, fullName: true, email: true } } } },
          attendances: { select: { status: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const classStats = allReports.map((classReport) => {
      const totalStudents = classReport.students.length;
      const totalAttendanceRate = classReport.students.reduce((sum, student) => sum + (student.attendanceRate || 0), 0);
      const avgAttendance = totalStudents > 0 ? totalAttendanceRate / totalStudents : 0;
      return {
        classId: classReport.class.id, classCode: classReport.class.code, className: classReport.class.name,
        lecturer: classReport.class.lecturer, totalSessions: classReport.totalSessions,
        totalStudents: classReport.totalStudents, averageAttendance: Math.round(avgAttendance * 100) / 100,
      };
    });
    const lecturerMap = new Map<string, { lecturerId: string | null; lecturerName: string; lecturerEmail: string | null; totalClasses: number; totalStudents: number; cumulativeAttendance: number }>();
    classStats.forEach((stat) => {
      const key = stat.lecturer?.id || 'unassigned';
      if (!lecturerMap.has(key)) {
        lecturerMap.set(key, { lecturerId: stat.lecturer?.id || null, lecturerName: stat.lecturer?.fullName || 'Chưa gán', lecturerEmail: stat.lecturer?.email || null, totalClasses: 0, totalStudents: 0, cumulativeAttendance: 0 });
      }
      const bucket = lecturerMap.get(key)!;
      bucket.totalClasses += 1;
      bucket.totalStudents += stat.totalStudents;
      bucket.cumulativeAttendance += stat.averageAttendance;
    });

    const lecturerStats = Array.from(lecturerMap.values())
      .map((bucket) => ({
        lecturerId: bucket.lecturerId, lecturerName: bucket.lecturerName, lecturerEmail: bucket.lecturerEmail,
        totalClasses: bucket.totalClasses, totalStudents: bucket.totalStudents,
        averageAttendance: bucket.totalClasses > 0 ? Math.round((bucket.cumulativeAttendance / bucket.totalClasses) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.averageAttendance - a.averageAttendance);

    const liveSessionStats = liveSessions.map((session) => {
      const approved = session.attendances.filter((a) => a.status === AttendanceStatus.APPROVED).length;
      const pending = session.attendances.filter((a) => a.status === AttendanceStatus.PENDING).length;
      const rejected = session.attendances.filter((a) => a.status === AttendanceStatus.REJECTED).length;
      const total = session.attendances.length;
      const notCheckedIn = Math.max(total - approved - pending - rejected, 0);
      const attendanceRate = total > 0 ? Math.round((approved / total) * 100) : 0;
      return { sessionId: session.id, title: session.title, startTime: session.startTime, endTime: session.endTime, class: session.class, approved, pending, rejected, notCheckedIn, total, attendanceRate };
    });

    const summaryAverage = classStats.length > 0
      ? Math.round((classStats.reduce((sum, item) => sum + item.averageAttendance, 0) / classStats.length) * 100) / 100
      : 0;

    return {
      summary: { totalClasses: classStats.length, activeLecturers: lecturerStats.filter((lec) => lec.lecturerId).length, averageAttendance: summaryAverage, liveSessions: liveSessionStats.length },
      classStats, lecturerStats, liveSessions: liveSessionStats,
    };
  }
}
