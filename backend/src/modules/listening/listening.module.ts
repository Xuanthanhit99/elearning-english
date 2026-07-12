import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GeminiModule } from '../gemini/gemini.module';
import { MissionsV2Module } from '../missions-v2/missions-v2.module';
import { ListeningController } from './listening.controller';
import { ListeningService } from './listening.service';
import { ListeningTtsService } from './listening-tts.service';
import { ListeningJobModule } from '../listening-job/listening-job.module';

@Module({
  imports: [PrismaModule, GeminiModule, MissionsV2Module, ListeningJobModule],
  controllers: [ListeningController],
  providers: [ListeningService, ListeningTtsService],
  exports: [ListeningService],
})
export class ListeningModule {}
