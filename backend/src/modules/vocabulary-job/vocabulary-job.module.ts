import { Module } from '@nestjs/common';
import { VocabularyJobService } from './vocabulary-job.service';
import { GeminiModule } from '../gemini/gemini.module';
import { MissionsV2Module } from '../missions-v2/missions-v2.module';

@Module({
  imports: [GeminiModule, MissionsV2Module],
  providers: [VocabularyJobService],
  exports: [VocabularyJobService],
})
export class VocabularyJobModule {}
