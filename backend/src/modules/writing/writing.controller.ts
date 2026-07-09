import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Search,
  UseGuards,
} from '@nestjs/common';
import { WritingService } from './writing.service';
import { CheckWritingDto } from './dro/check-writing.dto';
import { OptionalJwtGuard } from 'src/common/guards/optional-jwt.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('writing')
export class WritingController {
  constructor(private readonly writingService: WritingService) {}

  @UseGuards(OptionalJwtGuard)
  @Post('check')
  checkWriting(@Body() dto: CheckWritingDto, @Req() req: any) {
    return this.writingService.checkWriting(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('ai/history')
  getMyWritingHistory(@Req() req: any) {
    return this.writingService.getMyHistory(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('home')
  getHome(@Req() req: any) {
    return this.writingService.getHome(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('progress')
  getProgress(@Req() req: any) {
    return this.writingService.getProgress(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history/recent')
  getRecentHistory(@Req() req: any) {
    return this.writingService.getRecentHistory(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('lessons/:lessonId/start')
  startLesson(@Param('lessonId') lessonId: string, @Req() req: any) {
    return this.writingService.startLesson(req.user.id, lessonId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('topics')
  getTopics(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('difficulty') difficulty?: string,
    @Query('progress') progress?: string,
    @Query('sort') sort?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.writingService.getTopics(req.user.id, {
      search,
      difficulty,
      progress,
      sort,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('topics/:slug')
  getTopicDetail(
    @Param('slug') slug: string,
    @Query('sort') sort: string,
    @Req() req: any,
  ) {
    return this.writingService.getTopicDetail(req.user.id, slug, sort);
  }

  @UseGuards(JwtAuthGuard)
  @Get('topics/:slug/types')
  getWritingTypes(@Param('slug') slug: string, @Req() req: any) {
    return this.writingService.getWritingTypes(req.user.id, slug);
  }

  @UseGuards(JwtAuthGuard)
  @Post('topics/:slug/types/:type/start')
  startWritingType(
    @Param('slug') slug: string,
    @Param('type') type: string,
    @Req() req: any,
  ) {
    return this.writingService.startWritingType(req.user.id, slug, type);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/:sessionId')
  getSession(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.writingService.getSession(req.user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/save')
  saveDraft(
    @Param('sessionId') sessionId: string,
    @Body() body: { content: string; timeSpentSeconds?: number },
    @Req() req: any,
  ) {
    return this.writingService.saveDraft(req.user.id, sessionId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/review')
  reviewEssay(
    @Param('sessionId') sessionId: string,
    @Body() body: { content: string; timeSpentSeconds?: number },
    @Req() req: any,
  ) {
    return this.writingService.reviewEssay(req.user.id, sessionId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/submit')
  submitEssay(
    @Param('sessionId') sessionId: string,
    @Body() body: { content: string; timeSpentSeconds?: number },
    @Req() req: any,
  ) {
    return this.writingService.submitEssay(req.user.id, sessionId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions/:sessionId/result')
  getResult(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.writingService.getResult(req.user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/retry')
  retryEssay(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.writingService.retryEssay(req.user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  getWritingHistory(
    @Req() req: any,
    @Query('topic') topic?: string,
    @Query('type') type?: string,
    @Query('level') level?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.writingService.getWritingHistory(req.user.id, {
      topic,
      type,
      level,
      status,
      from,
      to,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('history/:sessionId')
  getWritingHistoryDetail(
    @Param('sessionId') sessionId: string,
    @Req() req: any,
  ) {
    return this.writingService.getWritingHistoryDetail(req.user.id, sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('history/:sessionId/retry')
  retryFromHistory(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.writingService.retryEssay(req.user.id, sessionId);
  }

  @Post('sessions/:sessionId/rewrite')
  rewriteEssay(
    @Param('sessionId') sessionId: string,
    @Body() body: { content?: string },
    @Req() req: any,
  ) {
    return this.writingService.rewriteEssay(req.user.id, sessionId, body);
  }
}
