// src/pronunciation/pronunciation.module.ts
import { Module } from '@nestjs/common';
import { PronunciationController } from './pronunciation.controller';
import { PronunciationService } from './pronunciation.service';
import { GeminiModule } from '../gemini/gemini.module';
import { UploadModule } from '../upload/upload.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, GeminiModule, UploadModule],
  controllers: [PronunciationController],
  providers: [PronunciationService],
})
export class PronunciationModule {}