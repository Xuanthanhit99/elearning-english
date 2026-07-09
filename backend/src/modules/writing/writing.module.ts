import { Module } from '@nestjs/common';
import { WritingController } from './writing.controller';
import { WritingService } from './writing.service';
import { WritingJobService } from './writing-job/writing-job.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [WritingController],
  providers: [WritingService, WritingJobService, PrismaService],
})
export class WritingModule {}
