import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PlacementProcessingController } from './placement-processing.controller';
import { PlacementProcessingProcessor } from './placement-processing.processor';
import { PlacementProcessingService } from './placement-processing.service';
import { PlacementModule } from '../placement/placement.module';
import { PlacementResultModule } from '../placement-result/placement-result.module';
import { LearningXpModule } from '../learning-xp/learning-xp.module';

export const PLACEMENT_PROCESSING_QUEUE = 'placement-processing';

@Module({
  imports: [
    PrismaModule,
    PlacementModule,
    PlacementResultModule,
    BullModule.registerQueue({
      name: 'placement-processing',
    }),
    LearningXpModule
  ],
  controllers: [PlacementProcessingController],
  providers: [PlacementProcessingService, PlacementProcessingProcessor],
  exports: [PlacementProcessingService],
})
export class PlacementProcessingModule {}
