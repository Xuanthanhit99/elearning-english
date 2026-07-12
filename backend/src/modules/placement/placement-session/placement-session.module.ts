import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { QuestionBankModule } from '../../question-bank/question-bank.module';
import { PlacementSessionController } from './placement-session.controller';
import { PlacementSessionService } from './placement-session.service';

@Module({
  imports: [PrismaModule, QuestionBankModule],
  controllers: [PlacementSessionController],
  providers: [PlacementSessionService],
  exports: [PlacementSessionService],
})
export class PlacementSessionModule {}
