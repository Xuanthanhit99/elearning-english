import { Module } from '@nestjs/common';
import { SpeakingController } from './speaking.controller';
import { SpeakingService } from './speaking.service';
import { SpeakingJobService } from './speaking-job/speaking-job.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { SpeakingPracticeModule } from '../speaking-practice/speaking-practice.module';
import { SpeakingProcessingModule } from '../speaking-processing/speaking-processing.module';

@Module({
  imports: [SpeakingPracticeModule,SpeakingProcessingModule],
  controllers: [SpeakingController],
  providers: [SpeakingService, SpeakingJobService, PrismaService],
  exports: [SpeakingService],
})
export class SpeakingModule {}
