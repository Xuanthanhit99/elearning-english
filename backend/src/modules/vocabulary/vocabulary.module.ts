import { Module } from '@nestjs/common';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';
import { VocabularyJobModule } from '../vocabulary-job/vocabulary-job.module';
import { GeminiModule } from '../gemini/gemini.module';
import { MissionsV2Module } from '../missions-v2/missions-v2.module';
import { LearningXpModule } from '../learning-xp/learning-xp.module';

@Module({
  imports: [GeminiModule, VocabularyJobModule, MissionsV2Module,LearningXpModule],
  controllers: [VocabularyController],
  providers: [VocabularyService],
  exports: [VocabularyService],
})
export class VocabularyModule {}
