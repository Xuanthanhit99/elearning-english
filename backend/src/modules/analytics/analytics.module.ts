import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { SettingsModule } from '../settings/settings.module';
import { GeminiModule } from '../gemini/gemini.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { WeaknessDetectionService } from './weakness-detection.service';
import { SkillRadarService } from './skill-radar.service';
import { AiCoachService } from './ai-coach.service';

@Module({
  imports: [PrismaModule, DashboardModule, SettingsModule, GeminiModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    WeaknessDetectionService,
    SkillRadarService,
    AiCoachService,
  ],
  exports: [
    AnalyticsService,
    WeaknessDetectionService,
    SkillRadarService,
    AiCoachService,
  ],
})
export class AnalyticsModule {}
