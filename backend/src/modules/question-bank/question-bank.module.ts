import { forwardRef, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QuestionBankService } from './question-bank.service';
import { QuestionGenerationLockService } from './question-generation-lock/question-generation-lock.service';
import { PlacementAiService } from '../placement/placement-ai/placement-ai.service';
import { PlacementModule } from '../placement/placement.module';
import { QuestionGenerationLockModule } from './question-generation-lock/question-generation-lock.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => PlacementModule),
    QuestionGenerationLockModule,
  ],
  providers: [
    QuestionBankService,
    QuestionGenerationLockService,
    PlacementAiService,
  ],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
