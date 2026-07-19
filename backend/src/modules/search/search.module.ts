import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { SearchController } from './search.controller';
import { SearchRouteRegistry } from './search-route.registry';
import { SearchService } from './search.service';

@Module({
  imports: [PrismaModule, DashboardModule],
  controllers: [SearchController],
  providers: [SearchService, SearchRouteRegistry],
  exports: [SearchService],
})
export class SearchModule {}
