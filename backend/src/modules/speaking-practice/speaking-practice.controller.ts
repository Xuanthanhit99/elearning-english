import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import {
  EvaluateSpeakingDto,
  TranscribeSpeakingDto,
} from './dto/speaking-practice.dto';
import { SpeakingService } from '../speaking/speaking.service';

@Controller('speaking-practice')
export class SpeakingPracticeController {
  constructor(private speakingService: SpeakingService) {}

  @UseGuards(JwtAuthGuard)
  @Get('sessions/:sessionId')
  async getPracticeSession(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    const data = await this.speakingService.getPracticeSession(
      req.user.id,
      sessionId,
    );
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/transcribe')
  async transcribePracticeAudio(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: TranscribeSpeakingDto,
  ) {
    const data = await this.speakingService.transcribePracticeAudio(
      req.user.id,
      sessionId,
      dto,
    );
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/evaluate')
  async evaluatePracticeAnswer(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: EvaluateSpeakingDto,
  ) {
    const data = await this.speakingService.evaluatePracticeAnswer(
      req.user.id,
      sessionId,
      dto,
    );
    return { success: true, data };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/:sessionId/finish-practice')
  async finishPractice(@Req() req: any, @Param('sessionId') sessionId: string) {
    const data = await this.speakingService.finishSession(
      req.user.id,
      sessionId,
    );
    return { success: true, data };
  }
}
