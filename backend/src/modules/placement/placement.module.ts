import { Module } from '@nestjs/common';
import { PlacementController } from './placement.controller';
import { PlacementService } from './placement.service';
import { PlacementTestService } from './placement-test/placement-test.service';
import { PlacementTestController } from './placement-test/placement-test.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PlacementAiService } from './placement-ai/placement-ai.service';
import { PlacementQuestionPoolService } from './placement-question-pool/placement-question-pool.service';
import { QuestionBankModule } from '../question-bank/question-bank.module';

import { PlacementResponseController } from './placement-response.controller';
import { PlacementResponseService } from './placement-response.service';
import { PlacementTtsService } from './placement-tts.service';
import { PlacementRetakeService } from '../placement-dashboard/placement-retake.service';
import { PlacementSessionService } from './placement-session/placement-session.service';

@Module({
  imports: [PrismaModule, QuestionBankModule],
  controllers: [
    PlacementController,
    PlacementTestController,
    PlacementResponseController,
  ],
  providers: [
    PlacementService,
    PlacementTestService,
    PlacementAiService,
    PlacementQuestionPoolService,
    PlacementResponseService,
    PlacementTtsService,
    PlacementRetakeService,
    PlacementSessionService,
  ],
  exports: [
    PlacementService,
    PlacementTestService,
    PlacementQuestionPoolService,
    PlacementAiService,
    PlacementTtsService,
    PlacementRetakeService,
    PlacementSessionService,
  ],
})
export class PlacementModule {}
