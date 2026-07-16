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

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'english_secret_key',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as StringValue,
      },
    }),
    PassportModule,
    GoogleStrategy,
    FacebookStrategy,
    VocabularyModule,
    VocabularyJobModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    PassportModule,
    GoogleStrategy,
    FacebookStrategy,
    UploadService,
  ],
  exports: [JwtModule]
})
export class AuthModule {}
