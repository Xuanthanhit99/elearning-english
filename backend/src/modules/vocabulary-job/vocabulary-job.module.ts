import { Module } from '@nestjs/common';
import { VocabularyJobService } from './vocabulary-job.service';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  providers: [VocabularyJobService],
  exports: [VocabularyJobService],
})
export class VocabularyJobModule {}
