import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { LearningPathAccessController } from './learning-path-access.controller';
import { LearningPathAccessGuard } from './learning-path-access.guard';
import { LearningPathAccessService } from './learning-path-access.service';

@Module({
  imports: [PrismaModule],
  controllers: [LearningPathAccessController],
  providers: [LearningPathAccessService, LearningPathAccessGuard],
  exports: [LearningPathAccessService, LearningPathAccessGuard],
})
export class LearningPathAccessModule {}
