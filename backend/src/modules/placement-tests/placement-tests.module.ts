import { Module } from '@nestjs/common';
import { PlacementTestsController } from './placement-tests.controller';
import { PlacementTestsService } from './placement-tests.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GeminiModule } from '../gemini/gemini.module';

@Module({
  controllers: [PlacementTestsController],
  providers: [PlacementTestsService],
  imports: [PrismaModule, GeminiModule],
})
export class PlacementTestsModule {}
