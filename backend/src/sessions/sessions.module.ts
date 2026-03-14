import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { SessionBuilderDirector } from './builders/session.builder';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [JwtModule, ConfigModule, UsersModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionBuilderDirector],
  exports: [SessionsService],
})
export class SessionsModule {}
