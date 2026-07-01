import { Module } from '@nestjs/common';
import { VocabularyJobService } from './vocabulary-job.service';

@Module({
  providers: [VocabularyJobService],
  exports: [VocabularyJobService],
})
export class VocabularyJobModule {}
