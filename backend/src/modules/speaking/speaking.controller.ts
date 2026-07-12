import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { SpeakingService } from './speaking.service';
import { GetSpeakingTopicsDto } from './dto/get-speaking-topics.dto';
import { GetTopicLessonsDto } from './dto/get-topic-lessons.dto';
import { GetSpeakingCategoriesDto } from './dto/get-speaking-categories.dto';
import { SubmitSpeakingAnswerDto } from './dto/submit-speaking-answer.dto';
import { GetSpeakingHistoryDto } from './dto/get-speaking-history.dto';

@Controller('speaking')
export class SpeakingController {
  constructor(private readonly speakingService: SpeakingService) {}

  @UseGuards(JwtAuthGuard)
  @Get('home')
  async getHome(@Req() req: any) {
    const userId = req.user.id;

    const data = await this.speakingService.getHome(userId);

    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('topics')
  async getTopics(@Query() query: GetSpeakingTopicsDto, @Req() req: any) {
    const userId = req.user.id;
    const data = await this.speakingService.getTopics(userId, query);

    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('topics/:slug')
  async getTopicDetail(@Param('slug') slug: string, @Req() req: any) {
    const userId = req.user.id;

    const data = await this.speakingService.getTopicDetail(slug, userId);

    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('topics/:slug/lessons')
  async getTopicLessons(
    @Param('slug') slug: string,
    @Query() query: GetTopicLessonsDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;

    const data = await this.speakingService.getTopicLessons(
      slug,
      userId,
      query,
    );

    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('lessons/:lessonId/start')
  async startLesson(@Req() req: any, @Param('lessonId') lessonId: string) {
    const data = await this.speakingService.startLesson(req.user.id, lessonId);

    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/generate-question')
  async generateQuestion(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    const data = await this.speakingService.generateQuestion(
      req.user.id,
      sessionId,
    );

    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/answers')
  async submitAnswer(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitSpeakingAnswerDto,
  ) {
    const data = await this.speakingService.submitAnswer(
      req.user.id,
      sessionId,
      dto,
    );

    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/finish')
  async finishSession(@Req() req: any, @Param('sessionId') sessionId: string) {
    const data = await this.speakingService.finishSession(
      req.user.id,
      sessionId,
    );

    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('categories')
  async getCategories(
    @Query() query: GetSpeakingCategoriesDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    const data = await this.speakingService.getCategories(userId, query);

    return {
      success: true,
      data,
    };
  }

  // src/modules/speaking/speaking.controller.ts

  @UseGuards(JwtAuthGuard)
  @Get('categories/:slug')
  async getCategoryDetail(@Param('slug') slug: string, @Req() req: any) {
    const data = await this.speakingService.getCategoryDetail(
      slug,
      req.user.id,
    );

    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('categories/:slug/lessons')
  async getCategoryLessons(
    @Param('slug') slug: string,
    @Query() query: GetTopicLessonsDto,
    @Req() req: any,
  ) {
    const data = await this.speakingService.getCategoryLessons(
      slug,
      req.user.id,
      query,
    );

    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getHistory(@Req() req: any, @Query() query: GetSpeakingHistoryDto) {
    const data = await this.speakingService.getHistory(req.user.id, query);

    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('history/:id')
  async getHistoryDetail(@Req() req: any, @Param('id') id: string) {
    const data = await this.speakingService.getHistoryDetail(req.user.id, id);

    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('history/:id/practice-again')
  async practiceAgain(@Req() req: any, @Param('id') id: string) {
    const data = await this.speakingService.practiceAgainFromHistory(
      req.user.id,
      id,
    );

    return {
      success: true,
      data,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('history/:id/practice-type-detail')
  async getPracticeTypeDetail(@Req() req: any, @Param('id') id: string) {
    const data = await this.speakingService.getPracticeTypeDetail(
      req.user.id,
      id,
    );

    return {
      success: true,
      data,
    };
  }
}
