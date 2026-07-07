import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReadingService } from './reading.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('reading')
@UseGuards(JwtAuthGuard)
export class ReadingController {
  constructor(private readonly readingService: ReadingService) {}

  @Get('home')
  getHome(@CurrentUser() user: { id: string }) {
    return this.readingService.getReadingHome(user.id);
  }

  @Get('categories')
  getCategories(
    @CurrentUser() user: { id: string },
    @Query('difficulty') difficulty?: 'EASY' | 'MEDIUM' | 'HARD',
    @Query('sort') sort?: 'recommended' | 'newest' | 'progress' | 'name',
  ) {
    return this.readingService.getReadingCategories(user.id, {
      difficulty,
      sort,
    });
  }

  @Get('categories/:slug')
  getCategoryDetail(
    @CurrentUser() user: { id: string },
    @Param('slug') slug: string,
  ) {
    return this.readingService.getReadingCategoryDetail(user.id, slug);
  }
}
