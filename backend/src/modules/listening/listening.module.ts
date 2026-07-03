import { Module } from '@nestjs/common';
import { ListeningController } from './listening.controller';
import { ListeningService } from './listening.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  imports: [GeminiModule],
  controllers: [ListeningController],
  providers: [ListeningService, PrismaService]
})
export class ListeningModule {}
