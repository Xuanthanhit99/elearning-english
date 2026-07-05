import { Module } from '@nestjs/common';
import { GrammarController } from './grammar.controller';
import { GrammarService } from './grammar.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GrammarJobService } from './grammar-job/grammar-job.service';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [GrammarController],
  providers: [GrammarService, PrismaService, GrammarJobService],
})
export class GrammarModule {}
