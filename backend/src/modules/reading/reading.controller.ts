import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReadingService } from './reading.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('reading')
@UseGuards(JwtAuthGuard)
export class ReadingController {
  constructor(private readonly readingService: ReadingService) { }

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

  @Get('articles/:slug')
  getArticleDetail(
    @CurrentUser() user: { id: string },
    @Param('slug') slug: string,
  ) {
    return this.readingService.getReadingArticleDetail(user.id, slug);
  }

  @Post('articles/:articleId/start')
  startArticle(
    @CurrentUser() user: { id: string },
    @Param('articleId') articleId: string,
  ) {
    return this.readingService.startReadingArticle(user.id, articleId);
  }

  @Post('sessions/:sessionId/answer')
  answerQuestion(
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      questionId: string;
      selected: string;
    },
  ) {
    return this.readingService.answerReadingQuestion(sessionId, body);
  }

  @Post('sessions/:sessionId/submit')
  submitSession(@Param('sessionId') sessionId: string) {
    return this.readingService.submitReadingSession(sessionId);
  }
}
