import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttendanceService } from './attendance.service';
import { CheckInQRDto } from './dto/checkin-qr.dto';
import { CheckInOTPDto } from './dto/checkin-otp.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { multerOptions } from '../common/config/multer.config';

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('checkin-qr')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  async checkInQR(
    @CurrentUser() user: any,
    @Body() checkInDto: CheckInQRDto,
  ) {
    return this.attendanceService.checkInQR(user.id, checkInDto);
  }

  @Post('checkin-otp')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async checkInOTP(
    @CurrentUser() user: any,
    @Body() checkInDto: CheckInOTPDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File ảnh là bắt buộc');
    }
    return this.attendanceService.checkInOTP(user.id, checkInDto, file);
  }

  @Get('report/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async getAllClassesAttendanceReport() {
    return this.attendanceService.getAllClassesAttendanceReport();
  }

  @Get('report/class/:classId')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async getClassAttendanceReport(@Param('classId') classId: string) {
    return this.attendanceService.getClassAttendanceReport(classId);
  }

  @Get('session/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async getSessionAttendances(@Param('id') id: string) {
    return this.attendanceService.getSessionAttendances(id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async approve(@Param('id') id: string) {
    return this.attendanceService.approveAttendance(id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async reject(@Param('id') id: string) {
    return this.attendanceService.rejectAttendance(id);
  }
}

