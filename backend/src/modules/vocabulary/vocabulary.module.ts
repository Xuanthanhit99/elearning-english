import { Module } from '@nestjs/common';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';
import { VocabularyJobModule } from '../vocabulary-job/vocabulary-job.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [GeminiModule, VocabularyJobModule],
  controllers: [VocabularyController],
  providers: [VocabularyService],
  exports: [VocabularyService],
})
export class VocabularyModule {}
