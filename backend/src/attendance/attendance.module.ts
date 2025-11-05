import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { SessionsModule } from '../sessions/sessions.module';
import { EvidenceModule } from '../evidence/evidence.module';

@Module({
  imports: [SessionsModule, EvidenceModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}

