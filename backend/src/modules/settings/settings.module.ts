import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsQueryService } from './settings-query.service';
import { SettingsCommandService } from './settings-command.service';
import { LearningDnaService } from './learning-dna.service';
import { EnergyModeService } from './energy-mode.service';
import { SETTINGS_REDIS } from './settings.constants';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [SettingsController],
  providers: [
    SettingsService,
    SettingsQueryService,
    SettingsCommandService,
    LearningDnaService,
    EnergyModeService,
    {
      provide: SETTINGS_REDIS,
      useFactory: () =>
        new Redis({
          host: process.env.REDIS_HOST ?? '127.0.0.1',
          port: Number(process.env.REDIS_PORT ?? 6379),
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: null,
        }),
    },
  ],
  exports: [
    SettingsService,
    SettingsQueryService,
    SettingsCommandService,
    LearningDnaService,
    EnergyModeService,
  ],
})
export class SettingsModule {}
