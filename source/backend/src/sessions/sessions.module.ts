import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { SessionBuilderDirector } from './builders/session.builder';
import { UsersModule } from '../users/users.module';
import { QRTokenService } from '../common/utils/qr-token.util';
import {
  JWTTokenAdapter,
  JSONTokenAdapter,
  RawJWTPayloadAdapter,
  QRTokenAdapterManager,
} from '../common/utils/qr-token-adapter';

@Module({
  imports: [JwtModule, ConfigModule, UsersModule],
  controllers: [SessionsController],
  providers: [
    SessionsService,
    SessionBuilderDirector,
    QRTokenService,
    JWTTokenAdapter,
    JSONTokenAdapter,
    RawJWTPayloadAdapter,
    QRTokenAdapterManager,
  ],
  exports: [SessionsService, QRTokenService, QRTokenAdapterManager],
})
export class SessionsModule {}
