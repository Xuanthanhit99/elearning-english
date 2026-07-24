import { Module } from '@nestjs/common';
import { SpeakingPracticeController } from './speaking-practice.controller';
import { SpeakingPracticeService } from './speaking-practice.service';
import { SpeakingService } from '../speaking/speaking.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { LearningXpModule } from '../learning-xp/learning-xp.module';
import { SettingsModule } from '../settings/settings.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [LearningXpModule, SettingsModule, GeminiModule],
  controllers: [SpeakingPracticeController],
  providers: [SpeakingPracticeService, SpeakingService, PrismaService],
  exports: [SpeakingPracticeService],
})
export class SpeakingPracticeModule {}
