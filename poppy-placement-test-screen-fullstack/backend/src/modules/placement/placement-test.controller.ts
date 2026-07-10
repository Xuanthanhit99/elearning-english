import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PlacementTestService } from './placement-test.service';
import { AnswerPlacementQuestionDto } from './dto/answer-placement-question.dto';
import { FlagPlacementQuestionDto } from './dto/flag-placement-question.dto';
import { SkipPlacementQuestionDto } from './dto/skip-placement-question.dto';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
};

@Controller('placement/tests')
@UseGuards(JwtAuthGuard)
export class PlacementTestController {
  constructor(
    private readonly placementTestService: PlacementTestService,
  ) {}

  @Get(':sessionId')
  async getSession(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
  ) {
    return {
      success: true,
      data: await this.placementTestService.getSession(
        this.getUserId(req),
        sessionId,
      ),
    };
  }

  @Post(':sessionId/answer')
  async answerQuestion(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: AnswerPlacementQuestionDto,
  ) {
    return {
      success: true,
      message: 'Đã lưu câu trả lời.',
      data: await this.placementTestService.answerQuestion(
        this.getUserId(req),
        sessionId,
        dto,
      ),
    };
  }

  @Post(':sessionId/flag')
  async flagQuestion(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: FlagPlacementQuestionDto,
  ) {
    return {
      success: true,
      message: dto.isFlagged
        ? 'Đã đánh dấu câu hỏi.'
        : 'Đã bỏ đánh dấu câu hỏi.',
      data: await this.placementTestService.flagQuestion(
        this.getUserId(req),
        sessionId,
        dto,
      ),
    };
  }

  @Post(':sessionId/skip')
  async skipQuestion(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: SkipPlacementQuestionDto,
  ) {
    return {
      success: true,
      message: 'Đã bỏ qua câu hỏi.',
      data: await this.placementTestService.skipQuestion(
        this.getUserId(req),
        sessionId,
        dto,
      ),
    };
  }

  private getUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng đăng nhập.',
      );
    }

    return userId;
  }
}
