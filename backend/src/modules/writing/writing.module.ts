import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MissionsV2Module } from '../missions-v2/missions-v2.module';
import { WritingController } from './writing.controller';
import { WritingService } from './writing.service';
import { WritingJobService } from './writing-job/writing-job.service';
import { WritingAiEvaluationService } from './writing-ai-evaluation.service';
import { WRITING_PROCESSING_QUEUE } from './writing-processing.constants';
import { WritingProcessingService } from './writing-processing.service';
import { WritingProcessor } from './writing.processor';
import { WritingSessionService } from './writing-session.service';
import { WritingHistoryService } from './writing-history.service';
import { LearningXpModule } from '../learning-xp/learning-xp.module';
import { SettingsModule } from '../settings/settings.module';
import { GeminiModule } from '../gemini/gemini.module';
import { QuestionGenerationLockModule } from '../question-bank/question-generation-lock/question-generation-lock.module';

@Module({
  imports: [
    PrismaModule,
    MissionsV2Module,
    BullModule.registerQueue({
      name: WRITING_PROCESSING_QUEUE,
    }),
    LearningXpModule,
    SettingsModule,
    GeminiModule,
    QuestionGenerationLockModule,
  ],
  controllers: [WritingController],
  providers: [
    WritingService,
    WritingJobService,
    WritingSessionService,
    WritingProcessingService,
    WritingProcessor,
    WritingAiEvaluationService,
    WritingHistoryService,
  ],
  exports: [
    WritingService,
    WritingSessionService,
    WritingProcessingService,
    WritingHistoryService,
  ],
})
export class WritingModule {}
