import { Module } from '@nestjs/common';
import { PlacementResultController } from './placement-result.controller';
import { PlacementResultService } from './placement-result.service';
import { PlacementResultAiService } from './placement-result-ai/placement-result-ai.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlacementResultController],
  providers: [PlacementResultService, PlacementResultAiService],
  exports: [PlacementResultService],
})
export class PlacementResultModule {}
