/**
 * OBSERVER PATTERN - Attendance Event Observer
 * 
 * Bối cảnh: Khi có thay đổi trạng thái điểm danh (APPROVED, REJECTED, PENDING),
 * hệ thống cần thông báo cho nhiều thành phần khác nhau:
 * 1. Logging service - ghi log hoạt động
 * 2. Notification service - gửi thông báo cho sinh viên
 * 3. Analytics service - cập nhật thống kê
 * 
 * Observer pattern giúp decoupling giữa subject (attendance) và các observers
 */

import { Inject, Injectable } from '@nestjs/common';
import { AttendanceMethod, AttendanceStatus } from '@prisma/client';

export const ATTENDANCE_OBSERVERS = 'ATTENDANCE_OBSERVERS';

export interface AttendanceEvent {
  attendanceId: string;
  studentId: string;
  sessionId: string;
  oldStatus: AttendanceStatus | null;
  newStatus: AttendanceStatus;
  method: AttendanceMethod;
  timestamp: Date;
}

/**
 * Observer Interface
 */
export interface AttendanceObserver {
  /**
   * Called when attendance status changes
   */
  onAttendanceChange(event: AttendanceEvent): Promise<void>;

  /**
   * Called when attendance is approved
   */
  onAttendanceApproved(event: AttendanceEvent): Promise<void>;

  /**
   * Called when attendance is rejected
   */
  onAttendanceRejected(event: AttendanceEvent): Promise<void>;

  /**
   * Called when attendance is pending
   */
  onAttendancePending(event: AttendanceEvent): Promise<void>;
}

/**
 * Logging Observer - Ghi log hoạt động điểm danh
 */
@Injectable()
export class AttendanceLoggingObserver implements AttendanceObserver {
  async onAttendanceChange(event: AttendanceEvent): Promise<void> {
    console.log(`[ATTENDANCE] ${event.studentId} - ${event.oldStatus} -> ${event.newStatus}`);
  }

  async onAttendanceApproved(event: AttendanceEvent): Promise<void> {
    console.log(`[APPROVED] Attendance ${event.attendanceId} approved for session ${event.sessionId}`);
  }

  async onAttendanceRejected(event: AttendanceEvent): Promise<void> {
    console.log(`[REJECTED] Attendance ${event.attendanceId} rejected for session ${event.sessionId}`);
  }

  async onAttendancePending(event: AttendanceEvent): Promise<void> {
    console.log(`[PENDING] Attendance ${event.attendanceId} pending approval for session ${event.sessionId}`);
  }
}

/**
 * Analytics Observer - Cập nhật thống kê
 */
@Injectable()
export class AttendanceAnalyticsObserver implements AttendanceObserver {
  private stats = {
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
  };

  async onAttendanceChange(event: AttendanceEvent): Promise<void> {
    this.stats.total++;
  }

  async onAttendanceApproved(event: AttendanceEvent): Promise<void> {
    this.stats.approved++;
    console.log(`[ANALYTICS] Total approved: ${this.stats.approved}`);
  }

  async onAttendanceRejected(event: AttendanceEvent): Promise<void> {
    this.stats.rejected++;
    console.log(`[ANALYTICS] Total rejected: ${this.stats.rejected}`);
  }

  async onAttendancePending(event: AttendanceEvent): Promise<void> {
    this.stats.pending++;
    console.log(`[ANALYTICS] Total pending: ${this.stats.pending}`);
  }

  getStats() {
    return { ...this.stats };
  }
}

/**
 * Subject - Quản lý danh sách observers
 */
@Injectable()
export class AttendanceSubject {
  private observers: AttendanceObserver[] = [];

  constructor(
    @Inject(ATTENDANCE_OBSERVERS) observers: AttendanceObserver[] = [],
  ) {
    this.observers = [...new Set(observers)];
  }

  /**
   * Đăng ký observer
   */
  attach(observer: AttendanceObserver): void {
    if (!this.observers.includes(observer)) {
      this.observers.push(observer);
    }
  }

  /**
   * Hủy đăng ký observer
   */
  detach(observer: AttendanceObserver): void {
    const index = this.observers.indexOf(observer);
    if (index > -1) {
      this.observers.splice(index, 1);
    }
  }

  /**
   * Thông báo cho tất cả observers
   */
  async notify(event: AttendanceEvent): Promise<void> {
    await Promise.all(
      this.observers.map(async (observer) => {
        try {
          await observer.onAttendanceChange(event);

          switch (event.newStatus) {
            case AttendanceStatus.APPROVED:
              await observer.onAttendanceApproved(event);
              break;
            case AttendanceStatus.REJECTED:
              await observer.onAttendanceRejected(event);
              break;
            case AttendanceStatus.PENDING:
              await observer.onAttendancePending(event);
              break;
          }
        } catch (error) {
          console.error(`[ERROR] Observer notification failed:`, error);
        }
      }),
    );
  }
}

