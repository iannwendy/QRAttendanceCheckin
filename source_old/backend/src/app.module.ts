import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClassesModule } from './classes/classes.module';
import { SessionsModule } from './sessions/sessions.module';
import { AttendanceModule } from './attendance/attendance.module';
import { EvidenceModule } from './evidence/evidence.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      expandVariables: true,
    }),
    ServeStaticModule.forRoot({
      // Use process.cwd() to be consistent between dev (ts-node) and prod (dist)
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'dev_change_me',
        signOptions: { expiresIn: '7d' },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClassesModule,
    SessionsModule,
    AttendanceModule,
    EvidenceModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
