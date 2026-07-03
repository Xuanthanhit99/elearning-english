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

  @Post('sessions/:sessionId/finish')
  finishSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.listeningPrivate.finishSession(user.id, sessionId);
  }
}
