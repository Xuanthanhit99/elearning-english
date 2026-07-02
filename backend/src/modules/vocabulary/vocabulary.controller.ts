import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VocabularyService } from './vocabulary.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateWordDto } from './dto/create-word.dto';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateLearningProfileDto } from './dto/update-learning-profile.dto';
import { SubmitWeeklyTestDto } from './dto/submit-weekly-test.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { UpdateWordProgressDto } from './dto/update-word-progress.dto';
import { SubmitReviewSessionDto } from './dto/review-session-answer.dto';

@Controller('vocabulary')
export class VocabularyController {
  constructor(private vocabularyService: VocabularyService) {}

  @Get('topics')
  getTopics() {
    return this.vocabularyService.getTopics();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: any) {
    return this.vocabularyService.getOrCreateProfile(user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateLearningProfileDto,
  ) {
    return this.vocabularyService.updateProfile(user.id, dto);
  }

  @Get('today')
  @UseGuards(JwtAuthGuard)
  getToday(@CurrentUser() user: any) {
    return this.vocabularyService.getTodayVocabulary(user.id);
  }

  @Get('weekly-plan')
  @UseGuards(JwtAuthGuard)
  getWeeklyPlan(@CurrentUser() user: any) {
    return this.vocabularyService.getOrCreateUserWeeklyPlan(user.id);
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  searchWord(@Query('q') keyword: string, @CurrentUser() user: any) {
    return this.vocabularyService.searchWord(keyword, user.id);
  }

  @Get('random')
  @UseGuards(JwtAuthGuard)
  getRandomWords(
    @CurrentUser() user: any,
    @Query('level') level?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vocabularyService.getRandomWords(
      user.id,
      level,
      Number(limit || 10),
    );
  }

  @Post('words/:wordId/progress')
  @UseGuards(JwtAuthGuard)
  updateProgress(
    @CurrentUser() user: any,
    @Param('wordId') wordId: string,
    @Body() dto: UpdateWordProgressDto,
  ) {
    return this.vocabularyService.updateWordProgress(
      user.id,
      wordId,
      dto.status,
    );
  }

  @Get('words/:wordId/detail')
  @UseGuards(JwtAuthGuard)
  getWordDetail(@CurrentUser() user: any, @Param('wordId') wordId: string) {
    return this.vocabularyService.getWordDetail(user.id, wordId);
  }

  @Get('words/:wordId/relations')
  @UseGuards(JwtAuthGuard)
  getWordRelations(@CurrentUser() user: any, @Param('wordId') wordId: string) {
    return this.vocabularyService.getWordRelations(user.id, wordId);
  }

  @Get('daily/:dayId/words')
  @UseGuards(JwtAuthGuard)
  getDailyWords(@CurrentUser() user: any, @Param('dayId') dayId: string) {
    return this.vocabularyService.getDailyWords(user.id, dayId);
  }

  @Get('daily/:dayId/words/:wordId/navigation')
  @UseGuards(JwtAuthGuard)
  getWordNavigation(
    @CurrentUser() user: any,
    @Param('dayId') dayId: string,
    @Param('wordId') wordId: string,
  ) {
    return this.vocabularyService.getWordNavigation(user.id, dayId, wordId);
  }

  @Post('words/:wordId/notebook')
  @UseGuards(JwtAuthGuard)
  addNotebook(
    @CurrentUser() user: any,
    @Param('wordId') wordId: string,
    @Body() body: { note?: string },
  ) {
    return this.vocabularyService.addToNotebook(user.id, wordId, body?.note);
  }

  @Delete('words/:wordId/notebook')
  @UseGuards(JwtAuthGuard)
  removeNotebook(@CurrentUser() user: any, @Param('wordId') wordId: string) {
    return this.vocabularyService.removeFromNotebook(user.id, wordId);
  }

  @Get('notebook')
  @UseGuards(JwtAuthGuard)
  getNotebook(@CurrentUser() user: any) {
    return this.vocabularyService.getNotebook(user.id);
  }

  @Get('words/:wordId/flashcard')
  @UseGuards(JwtAuthGuard)
  getFlashcard(@CurrentUser() user: any, @Param('wordId') wordId: string) {
    return this.vocabularyService.getFlashcard(user.id, wordId);
  }

  @Get('daily/:dayId/flashcards')
  @UseGuards(JwtAuthGuard)
  getDailyFlashcards(@CurrentUser() user: any, @Param('dayId') dayId: string) {
    return this.vocabularyService.getDailyFlashcards(user.id, dayId);
  }

  @Post('flashcards/review')
  @UseGuards(JwtAuthGuard)
  reviewFlashcardSession(
    @CurrentUser() user: any,
    @Body()
    body: {
      reviews: Array<{
        wordId: string;
        rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
      }>;
    },
  ) {
    return this.vocabularyService.reviewFlashcardSession(
      user.id,
      body?.reviews || [],
    );
  }

  @Post('flashcards/:wordId/review')
  @UseGuards(JwtAuthGuard)
  reviewFlashcard(
    @CurrentUser() user: any,
    @Param('wordId') wordId: string,
    @Body()
    body: { isCorrect?: boolean; rating?: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY' },
  ) {
    return this.vocabularyService.reviewFlashcard(
      user.id,
      wordId,
      body?.isCorrect,
      body?.rating,
    );
  }

  @Post('daily/:dayId/complete')
  @UseGuards(JwtAuthGuard)
  completeDailyVocabulary(
    @CurrentUser() user: any,
    @Param('dayId') dayId: string,
  ) {
    return this.vocabularyService.completeDailyVocabulary(user.id, dayId);
  }

  @Get('me/history')
  @UseGuards(JwtAuthGuard)
  getHistory(@CurrentUser() user: any) {
    return this.vocabularyService.getMyHistory(user.id);
  }

  @Post('topics')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  createTopic(@Body() dto: CreateTopicDto) {
    return this.vocabularyService.createTopic(dto);
  }

  @Post('words')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  createWord(@Body() dto: CreateWordDto) {
    return this.vocabularyService.createWord(dto);
  }

  @Post('generate-words')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  generateWords(
    @Body()
    body: {
      topicId: string;
      level: string;
      count: number;
    },
  ) {
    return this.vocabularyService.generateWordsByGemini({
      topicId: body.topicId,
      level: body.level,
      count: body.count || 10,
    });
  }

  @Get('weekly-test')
  @UseGuards(JwtAuthGuard)
  getWeeklyTest(@CurrentUser() user: any) {
    return this.vocabularyService.getWeeklyTest(user.id);
  }

  @Post('weekly-test/start')
  @UseGuards(JwtAuthGuard)
  startWeeklyTest(@CurrentUser() user: any) {
    return this.vocabularyService.getWeeklyTest(user.id);
  }

  @Post('weekly-test/submit')
  @UseGuards(JwtAuthGuard)
  submitWeeklyTest(@CurrentUser() user: any, @Body() dto: SubmitWeeklyTestDto) {
    return this.vocabularyService.submitWeeklyTest(user.id, dto);
  }

  @Get('weekly-test/review')
  @UseGuards(JwtAuthGuard)
  getWeeklyTestReview(@CurrentUser() user: any) {
    return this.vocabularyService.getWeeklyTestReview(user.id);
  }

  @Post('weekly-test/retry')
  @UseGuards(JwtAuthGuard)
  retryWeeklyTest(@CurrentUser() user: any) {
    return this.vocabularyService.retryWeeklyTest(user.id);
  }

  @Get('review')
  @UseGuards(JwtAuthGuard)
  getReviewWords(@CurrentUser() user: any) {
    return this.vocabularyService.getReviewWords(user.id);
  }

  @Get('review/dashboard')
  @UseGuards(JwtAuthGuard)
  getReviewWordsDashboard(@CurrentUser() user: any) {
    return this.vocabularyService.getReviewDashboard(user.id);
  }

  @Get('review/suggestions')
  @UseGuards(JwtAuthGuard)
  getReviewSuggestions(@CurrentUser() user: any) {
    return this.vocabularyService.getReviewSuggestions(user.id);
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  getMyStats(@CurrentUser() user: any) {
    return this.vocabularyService.getMyStats(user.id);
  }

  @Get('challenge/today')
  @UseGuards(JwtAuthGuard)
  getTodayChallenge(@CurrentUser() user: any) {
    return this.vocabularyService.getTodayChallenge(user.id);
  }

  @Post('challenge/:challengeId/submit')
  @UseGuards(JwtAuthGuard)
  submitChallenge(
    @CurrentUser() user: any,
    @Param('challengeId') challengeId: string,
    @Body()
    body: {
      answers?: Array<{ wordId: string; answer: string }>;
      sentence?: string;
    },
  ) {
    return this.vocabularyService.submitChallenge(
      user.id,
      challengeId,
      body.answers || [],
      body.sentence,
    );
  }

  @Post('words/:wordId/share')
  @UseGuards(JwtAuthGuard)
  shareWord(
    @CurrentUser() user: any,
    @Param('wordId') wordId: string,
    @Body() body: { content?: string },
  ) {
    return this.vocabularyService.shareWord(user.id, wordId, body?.content);
  }

  @Post('review/submit')
  @UseGuards(JwtAuthGuard)
  submitReview(@CurrentUser() user: any, @Body() dto: SubmitReviewDto) {
    return this.vocabularyService.submitReview(user.id, dto);
  }

  @Get('review/session')
  @UseGuards(JwtAuthGuard)
  getReviewSession(@CurrentUser() user: any) {
    return this.vocabularyService.getReviewSession(user.id);
  }

  @Post('review/session')
  @UseGuards(JwtAuthGuard)
  submitReviewSession(
    @CurrentUser() user: any,
    @Body() dto: SubmitReviewSessionDto,
  ) {
    return this.vocabularyService.submitReviewSession(user.id, dto);
  }
}
