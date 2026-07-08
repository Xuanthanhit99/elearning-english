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
  @Get('history')
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
  @Post('sessions/:sessionId/save')
  saveDraft(
    @Param('sessionId') sessionId: string,
    @Body() body: { content: string },
    @Req() req: any,
  ) {
    return this.writingService.saveDraft(req.user.id, sessionId, body.content);
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
}
