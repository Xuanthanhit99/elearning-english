import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  SearchQueryDto,
  SearchSuggestionQueryDto,
} from './dto/search-query.dto';
import { SearchService } from './search.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  search(@CurrentUser() user: { id: string }, @Query() query: SearchQueryDto) {
    return this.searchService.search(user.id, query);
  }

  @Get('search/suggestions')
  suggestions(
    @CurrentUser() user: { id: string },
    @Query() query: SearchSuggestionQueryDto,
  ) {
    return this.searchService.suggestions(user.id, query);
  }

  @Get('discovery')
  discovery(@CurrentUser() user: { id: string }) {
    return this.searchService.discovery(user.id);
  }

  @Get('recommendations')
  recommendations(@CurrentUser() user: { id: string }) {
    return this.searchService.recommendations(user.id);
  }
}
