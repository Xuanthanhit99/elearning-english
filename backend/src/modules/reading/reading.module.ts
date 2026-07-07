import { Module } from '@nestjs/common';
import { ReadingController } from './reading.controller';
import { ReadingService } from './reading.service';
import { ReadingJobService } from './reading-job/reading-job.service';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [ReadingController],
  providers: [ReadingService, ReadingJobService]
})
export class ReadingModule {}
