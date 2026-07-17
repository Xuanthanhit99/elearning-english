import { Module } from '@nestjs/common';
import { PlacementResultController } from './placement-result.controller';
import { PlacementResultService } from './placement-result.service';
import { PlacementResultAiService } from './placement-result-ai/placement-result-ai.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LearningXpModule } from '../learning-xp/learning-xp.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, LearningXpModule, SettingsModule],
  controllers: [PlacementResultController],
  providers: [PlacementResultService, PlacementResultAiService],
  exports: [PlacementResultService],
})
export class PlacementResultModule {}
