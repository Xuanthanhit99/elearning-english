import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GrammarService } from './grammar.service';
import { ReportGrammarQuestionDto } from './dto/report-grammar-question.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubmitGrammarAnswerDto } from './dto/submit-grammar-answer.dto';

@Controller('grammar')
@UseGuards(JwtAuthGuard)
export class GrammarController {
  constructor(private readonly grammarService: GrammarService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: any, @Query('level') level?: string) {
    return this.grammarService.getDashboard(user.id, level);
  }

  @Get('categories')
  getCategories(@CurrentUser() user: any) {
    return this.grammarService.getCategories(user.id);
  }

  @Get('categories/:categorySlug/detail')
  getCategoryDetail(
    @CurrentUser() user: any,
    @Param('categorySlug') categorySlug: string,
  ) {
    return this.grammarService.getCategoryDetail(user.id, categorySlug);
  }

  @Get('topics')
  getTopics(@CurrentUser() user: any, @Query('level') level?: string) {
    return this.grammarService.getTopics(user.id, level);
  }

  @Get('topics/:topicId/lessons')
  getLessons(@CurrentUser() user: any, @Param('topicId') topicId: string) {
    return this.grammarService.getLessonsByTopic(user.id, topicId);
  }

  @Get('lessons/:lessonId')
  getLesson(@CurrentUser() user: any, @Param('lessonId') lessonId: string) {
    return this.grammarService.getLessonDetail(user.id, lessonId);
  }

  @Post('lessons/:lessonId/submit')
  submitLesson(
    @CurrentUser() user: any,
    @Param('lessonId') lessonId: string,
    @Body()
    body: {
      answers: {
        questionId: string;
        answer: string;
      }[];
    },
  ) {
    return this.grammarService.submitLesson(user.id, lessonId, body.answers);
  }

  @Get('topics/:topicId/detail')
  getTopicDetail(@CurrentUser() user: any, @Param('topicId') topicId: string) {
    return this.grammarService.getTopicDetail(user.id, topicId);
  }

  @Get('lessons/:lessonId/learning')
  getLessonLearning(
    @CurrentUser() user: any,
    @Param('lessonId') lessonId: string,
  ) {
    return this.grammarService.getLessonLearning(user.id, lessonId);
  }

  @Post('lessons/:lessonId/start')
  startLesson(@CurrentUser() user: any, @Param('lessonId') lessonId: string) {
    return this.grammarService.startLesson(user.id, lessonId);
  }

  @Post('lessons/:lessonId/complete')
  completeLesson(
    @CurrentUser() user: any,
    @Param('lessonId') lessonId: string,
  ) {
    return this.grammarService.completeLesson(user.id, lessonId);
  }

  @Post('lessons/:lessonId/note')
  saveLessonNote(
    @CurrentUser() user: any,
    @Param('lessonId') lessonId: string,
    @Body() body: { note: string },
  ) {
    return this.grammarService.saveLessonNote(user.id, lessonId, body.note);
  }
}
