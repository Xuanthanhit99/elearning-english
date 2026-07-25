import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsQueryService } from './settings-query.service';
import { SettingsCommandService } from './settings-command.service';
import { LearningDnaService } from './learning-dna.service';
import { EnergyModeService } from './energy-mode.service';
import { SETTINGS_REDIS } from './settings.constants';
import { createRedisClient } from '../../config/redis.config';

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
        createRedisClient({
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
