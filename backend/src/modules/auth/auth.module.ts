import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { UploadService } from '../upload/upload.service';
import { VocabularyModule } from '../vocabulary/vocabulary.module';
import { VocabularyJobModule } from '../vocabulary-job/vocabulary-job.module';
import { AuthSessionService } from './auth-session.service';
import { AuthTwoFactorService } from './auth-two-factor.service';
import { TwoFactorController } from './two-factor.controller';
import { AUTH_REDIS } from './auth.constants';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { MailModule } from '../mail/mail.module';
import { getJwtModuleSecret } from './auth-secrets.util';
import { createRedisClient } from '../../config/redis.config';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: getJwtModuleSecret(),
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as StringValue,
      },
    }),
    PassportModule,
    GoogleStrategy,
    FacebookStrategy,
    VocabularyModule,
    VocabularyJobModule,
    AuditLogModule,
    MailModule,
  ],
  controllers: [AuthController, TwoFactorController],
  providers: [
    AuthService,
    JwtStrategy,
    PassportModule,
    GoogleStrategy,
    FacebookStrategy,
    UploadService,
    AuthSessionService,
    AuthTwoFactorService,
    {
      provide: AUTH_REDIS,
      useFactory: () =>
        createRedisClient({
          maxRetriesPerRequest: null,
        }),
    },
  ],
  exports: [JwtModule, AuthSessionService],
})
export class AuthModule {}
