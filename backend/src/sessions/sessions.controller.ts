import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { ConfigService } from '@nestjs/config';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async create(@Body() createSessionDto: CreateSessionDto) {
    return this.sessionsService.create(createSessionDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessionsService.update(id, dto);
  }

  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    return this.sessionsService.findByPublicCode(code);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.sessionsService.findOne(id);
  }

  @Get(':id/qr')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async getQR(@Param('id') id: string) {
    const token = await this.sessionsService.getQRToken(id);
    const payload = await this.sessionsService.getQRPayload(id);
    const base = this.configService.get('FRONTEND_URL');
    const deepLink = base
      ? `${base}/checkin?token=${encodeURIComponent(token)}`
      : null;
    return { token, payload, deepLink };
  }

  @Get(':id/otp')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async getOTP(@Param('id') id: string) {
    const otp = await this.sessionsService.getOTP(id);
    return { otp };
  }

  @Delete('code/:code')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async removeByCode(@Param('code') code: string) {
    return this.sessionsService.removeByPublicCode(code);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.LECTURER, Role.ADMIN)
  async remove(@Param('id') id: string) {
    return this.sessionsService.remove(id);
  }
}
