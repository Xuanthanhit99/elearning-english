import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { StartListeningDto } from './dto/start-listening.dto';
import { SubmitListeningAnswerDto } from './dto/submit-listening-answer.dto';
import { ListeningService } from './listening.service';

@Controller('listening')
@UseGuards(JwtAuthGuard)
export class ListeningController {
  constructor(private readonly listeningService: ListeningService) {}

  @Get('home')
  getHome(@CurrentUser() user: { id: string }) {
    return this.listeningService.getHome(user.id);
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: { id: string },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.listeningService.getHistory(
      user.id,
      Number(page) || 1,
      Number(limit) || 10,
    );
  }

  /**
   * Route mới, đúng semantics vì tạo session.
   */
  @Post('practice/start')
  startPractice(
    @CurrentUser() user: { id: string },
    @Body() dto: StartListeningDto,
  ) {
    return this.listeningService.startPractice(user.id, dto);
  }

  /**
   * Giữ route cũ tạm thời để frontend cũ không hỏng.
   */
  @Get('practice')
  startPracticeLegacy(
    @CurrentUser() user: { id: string },
    @Query() query: StartListeningDto,
  ) {
    return this.listeningService.startPractice(user.id, query);
  }

  @Post('sessions/:sessionId/answer')
  submitAnswer(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitListeningAnswerDto,
  ) {
    return this.listeningService.submitAnswer(user.id, sessionId, dto);
  }

  @Post('sessions/:sessionId/skip')
  skipQuestion(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      questionId: string;
      timeSpent?: number;
      listenedCount?: number;
    },
  ) {
    return this.listeningService.skipQuestion(user.id, sessionId, body);
  }

  @Post('sessions/:sessionId/flag')
  flagQuestion(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      questionId: string;
      isFlagged?: boolean;
    },
  ) {
    return this.listeningService.flagQuestion(user.id, sessionId, body);
  }

  @Post('sessions/:sessionId/finish')
  finishSession(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
  ) {
    return this.listeningService.finishSession(user.id, sessionId);
  }

  @Get('sessions/:sessionId/result')
  getResult(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
  ) {
    return this.listeningService.getSessionResult(user.id, sessionId);
  }

  @Post('sessions/:sessionId/rating')
  rateSession(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      rating: number;
      comment?: string;
    },
  ) {
    return this.listeningService.rateSession(user.id, sessionId, body);
  }

  @Post('sessions/:sessionId/retry')
  retrySession(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
  ) {
    return this.listeningService.retrySession(user.id, sessionId);
  }

  @Post('sessions/:sessionId/continue')
  continueSession(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
  ) {
    return this.listeningService.continueSession(user.id, sessionId);
  }
}
