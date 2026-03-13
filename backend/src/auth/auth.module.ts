import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import {
  AdminAuthStrategy,
  LecturerAuthStrategy,
  StudentAuthStrategy,
  AuthStrategyContext,
} from './strategies/auth-strategy';

@Module({
  imports: [UsersModule, PassportModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    AdminAuthStrategy,
    LecturerAuthStrategy,
    StudentAuthStrategy,
    AuthStrategyContext,
  ],
  exports: [AuthService],
})
export class AuthModule {}
