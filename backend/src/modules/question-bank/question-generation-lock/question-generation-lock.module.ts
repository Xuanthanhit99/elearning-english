import { Module } from '@nestjs/common';
import { QuestionGenerationLockService } from './question-generation-lock.service';

@Module({
  providers: [QuestionGenerationLockService],
  exports: [QuestionGenerationLockService],
})
export class QuestionGenerationLockModule {}
