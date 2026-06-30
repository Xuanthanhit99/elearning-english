import { Module } from '@nestjs/common';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [MissionsController],
  providers: [MissionsService, PrismaService],
  exports: [MissionsService],
})
export class MissionsModule {}
