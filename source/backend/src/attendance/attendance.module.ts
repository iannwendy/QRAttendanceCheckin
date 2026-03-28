import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { SessionsModule } from '../sessions/sessions.module';
import { EvidenceModule } from '../evidence/evidence.module';
import {
  ATTENDANCE_OBSERVERS,
  AttendanceLoggingObserver,
  AttendanceAnalyticsObserver,
  AttendanceSubject,
} from './observers/attendance-observer';
import { AttendanceCheckInFacade } from './facades/attendance-checkin.facade';

@Module({
  imports: [SessionsModule, EvidenceModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceCheckInFacade,
    AttendanceLoggingObserver,
    AttendanceAnalyticsObserver,
    {
      provide: ATTENDANCE_OBSERVERS,
      useFactory: (
        loggingObserver: AttendanceLoggingObserver,
        analyticsObserver: AttendanceAnalyticsObserver,
      ) => [loggingObserver, analyticsObserver],
      inject: [AttendanceLoggingObserver, AttendanceAnalyticsObserver],
    },
    AttendanceSubject,
  ],
})
export class AttendanceModule {}
