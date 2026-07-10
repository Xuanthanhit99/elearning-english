import { Module } from '@nestjs/common';
import { PlacementController } from './placement.controller';
import { PlacementService } from './placement.service';
import { PlacementTestService } from './placement-test/placement-test.service';
import { PlacementTestController } from './placement-test/placement-test.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlacementController, PlacementTestController],
  providers: [PlacementService, PlacementTestService],
  exports: [PlacementService, PlacementTestService],
})
export class PlacementModule {}
