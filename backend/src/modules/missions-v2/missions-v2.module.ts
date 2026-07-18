import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MissionsV2Controller } from './missions-v2.controller';
import { MissionV2GeneratorService } from './services/mission-v2-generator.service';
import { MissionV2PeriodService } from './services/mission-v2-period.service';
import { MissionV2ProgressService } from './services/mission-v2-progress.service';
import { MissionV2QueryService } from './services/mission-v2-query.service';
import { MissionV2RewardService } from './services/mission-v2-reward.service';
import { MissionV2TemplateService } from './services/mission-v2-template.service';
import { LearningXpModule } from '../learning-xp/learning-xp.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    LearningXpModule,
    SettingsModule,
  ],
  controllers: [MissionsV2Controller],
  providers: [
    MissionV2PeriodService,
    MissionV2TemplateService,
    MissionV2GeneratorService,
    MissionV2ProgressService,
    MissionV2QueryService,
    MissionV2RewardService,
  ],
  exports: [MissionV2GeneratorService, MissionV2ProgressService],
})
export class MissionsV2Module {}
