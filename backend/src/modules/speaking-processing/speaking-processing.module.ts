import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MissionsV2Module } from '../missions-v2/missions-v2.module';
import { SpeakingAiEvaluationService } from './speaking-ai-evaluation.service';
import { SpeakingAudioStorageService } from './speaking-audio-storage.service';
import { SPEAKING_PROCESSING_QUEUE } from './speaking-processing.constants';
import { SpeakingProcessingController } from './speaking-processing.controller';
import { SpeakingProcessingProcessor } from './speaking-processing.processor';
import { SpeakingProcessingService } from './speaking-processing.service';
import { SpeakingSpeechToTextService } from './speaking-speech-to-text.service';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [
    PrismaModule,
    MissionsV2Module,
    BullModule.registerQueue({
      name: SPEAKING_PROCESSING_QUEUE,
    }),
    GeminiModule,
  ],
  controllers: [SpeakingProcessingController],
  providers: [
    SpeakingProcessingService,
    SpeakingProcessingProcessor,
    SpeakingAudioStorageService,
    SpeakingSpeechToTextService,
    SpeakingAiEvaluationService,
  ],
  exports: [SpeakingProcessingService],
})
export class SpeakingProcessingModule {}
