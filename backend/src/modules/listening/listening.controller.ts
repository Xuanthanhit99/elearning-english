import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ListeningService } from './listening.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { StartListeningDto } from './dto/start-listening.dto';
import { SubmitListeningAnswerDto } from './dto/submit-listening-answer.dto';

@Controller('listening')
@UseGuards(JwtAuthGuard)
export class ListeningController {
  constructor(private listeningPrivate: ListeningService) {}

  @Get('practice')
  startPractice(@CurrentUser() user: any, @Query() query: StartListeningDto) {
    return this.listeningPrivate.startPractice(user.id, query);
  }

  @Post('sessions/:sessionId/answer')
  submitAnswer(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitListeningAnswerDto,
  ) {
    return this.listeningPrivate.submitAnswer(user.id, sessionId, dto);
  }

  @Post('sessions/:sessionId/skip')
  skipQuestion(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body()
    body: { questionId: string; timeSpent?: number; listenedCount?: number },
  ) {
    return this.listeningPrivate.skipQuestion(user.id, sessionId, body);
  }

  @Post('sessions/:sessionId/flag')
  flagQuestion(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body() body: { questionId: string; isFlagged?: boolean },
  ) {
    return this.listeningPrivate.flagQuestion(user.id, sessionId, body);
  }

  @Post('sessions/:sessionId/finish')
  finishSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.listeningPrivate.finishSession(user.id, sessionId);
  }

  @Post('sessions/:sessionId/rating')
  rateSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.listeningPrivate.rateSession(user.id, sessionId, body);
  }

  @Post('sessions/:sessionId/retry')
  retrySession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.listeningPrivate.retrySession(user.id, sessionId);
  }

  @Post('sessions/:sessionId/continue')
  continueSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.listeningPrivate.continueSession(user.id, sessionId);
  }
}
