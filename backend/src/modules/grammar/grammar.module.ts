import { Module } from '@nestjs/common';
import { GrammarController } from './grammar.controller';
import { GrammarService } from './grammar.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GrammarJobService } from './grammar-job/grammar-job.service';
import { GeminiModule } from '../gemini/gemini.module';
import { MissionsV2Module } from '../missions-v2/missions-v2.module';
import { LearningXpModule } from '../learning-xp/learning-xp.module';

@Module({
  imports: [GeminiModule, MissionsV2Module, LearningXpModule],
  controllers: [GrammarController],
  providers: [GrammarService, PrismaService, GrammarJobService],
  exports: [GrammarService],
})
export class GrammarModule {}
