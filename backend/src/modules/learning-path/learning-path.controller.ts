import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LearningPathAccessGuard } from '../learning-path-access/learning-path-access.guard';
import { LearningPathService } from './learning-path.service';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
  };
};

@Controller('learning-path')
@UseGuards(JwtAuthGuard, LearningPathAccessGuard)
export class LearningPathController {
  constructor(private readonly learningPathService: LearningPathService) {}

  @Get()
  async getLearningPath(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.learningPathService.getLearningPath(this.getUserId(req)),
    };
  }

  @Post('lessons/:lessonId/start')
  async startLesson(
    @Req() req: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
  ) {
    return {
      success: true,
      data: await this.learningPathService.startLesson(
        this.getUserId(req),
        lessonId,
      ),
    };
  }

  @Get('lessons/:lessonId/resume')
  async resumeLesson(
    @Req() req: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
  ) {
    return {
      success: true,
      data: await this.learningPathService.resumeLesson(
        this.getUserId(req),
        lessonId,
      ),
    };
  }

  @Post('lessons/:lessonId/complete')
  async completeLesson(
    @Req() req: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
  ) {
    return {
      success: true,
      data: await this.learningPathService.completeLesson(
        this.getUserId(req),
        lessonId,
      ),
    };
  }

  private getUserId(req: AuthenticatedRequest) {
    const userId = req.user?.id ?? req.user?.userId ?? req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng đăng nhập.',
      );
    }

    return userId;
  }
}
