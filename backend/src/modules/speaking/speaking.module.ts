import { Module } from '@nestjs/common';
import { SpeakingController } from './speaking.controller';
import { SpeakingService } from './speaking.service';
import { SpeakingJobService } from './speaking-job/speaking-job.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SpeakingPracticeModule } from '../speaking-practice/speaking-practice.module';
import { SpeakingProcessingModule } from '../speaking-processing/speaking-processing.module';
import { LearningXpModule } from '../learning-xp/learning-xp.module';
import { SettingsModule } from '../settings/settings.module';
import { GeminiModule } from '../gemini/gemini.module';
import { QuestionGenerationLockModule } from '../question-bank/question-generation-lock/question-generation-lock.module';

@Module({
  imports: [
    SpeakingPracticeModule,
    SpeakingProcessingModule,
    LearningXpModule,
    SettingsModule,
    GeminiModule,
    QuestionGenerationLockModule,
  ],
  controllers: [SpeakingController],
  providers: [SpeakingService, SpeakingJobService, PrismaService],
  exports: [SpeakingService],
})
export class SpeakingModule {}
