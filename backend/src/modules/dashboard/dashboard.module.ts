import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MissionsV2Module } from '../missions-v2/missions-v2.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [PrismaModule, MissionsV2Module],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
