import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { SessionBuilderDirector } from './builders/session.builder';
import { UsersModule } from '../users/users.module';
import { QRTokenService } from '../common/utils/qr-token.util';

@Module({
  imports: [JwtModule, ConfigModule, UsersModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionBuilderDirector, QRTokenService],
  exports: [SessionsService, QRTokenService],
})
export class SessionsModule {}
