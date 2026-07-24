import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeminiModule } from '../gemini/gemini.module';
import { MissionsV2Module } from '../missions-v2/missions-v2.module';
import { ReadingController } from './reading.controller';
import { ReadingJobService } from './reading-job/reading-job.service';
import { ReadingService } from './reading.service';
import { LearningXpModule } from '../learning-xp/learning-xp.module';
import { QuestionGenerationLockModule } from '../question-bank/question-generation-lock/question-generation-lock.module';

@Module({
  imports: [
    PrismaModule,
    GeminiModule,
    MissionsV2Module,
    LearningXpModule,
    QuestionGenerationLockModule,
  ],
  controllers: [ReadingController],
  providers: [ReadingService, ReadingJobService],
  exports: [ReadingService],
})
export class ReadingModule {}
