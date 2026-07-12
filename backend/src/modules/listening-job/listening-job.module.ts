import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GeminiModule } from '../gemini/gemini.module';
import { ListeningTtsService } from '../listening/listening-tts.service';
import { ListeningAudioBackfillService } from './listening-audio-backfill.service';
import { LISTENING_GENERATION_QUEUE } from './listening-job.constants';
import { ListeningJobController } from './listening-job.controller';
import { ListeningJobProcessor } from './listening-job.processor';
import { ListeningJobService } from './listening-job.service';

@Module({
  imports: [
    PrismaModule,
    GeminiModule,
    BullModule.registerQueue({
      name: LISTENING_GENERATION_QUEUE,
    }),
  ],
  controllers: [ListeningJobController],
  providers: [
    ListeningJobService,
    ListeningJobProcessor,
    ListeningAudioBackfillService,
    ListeningTtsService,
  ],
  exports: [
    ListeningJobService,
    ListeningAudioBackfillService,
  ],
})
export class ListeningJobModule {}
