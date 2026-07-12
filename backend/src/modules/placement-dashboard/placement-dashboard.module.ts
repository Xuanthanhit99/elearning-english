import { Module } from '@nestjs/common';
import { PlacementDashboardController } from './placement-dashboard.controller';
import { PlacementDashboardService } from './placement-dashboard.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlacementDashboardController],
  providers: [PlacementDashboardService],
  exports: [PlacementDashboardService],
})
export class PlacementDashboardModule {}
