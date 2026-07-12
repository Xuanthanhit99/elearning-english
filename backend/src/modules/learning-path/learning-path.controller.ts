import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
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
@UseGuards(
  JwtAuthGuard,
  LearningPathAccessGuard,
)
export class LearningPathController {
  constructor(
    private readonly learningPathService: LearningPathService,
  ) {}

  @Get()
  async getLearningPath(
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      success: true,
      data:
        await this.learningPathService.getLearningPath(
          this.getUserId(req),
        ),
    };
  }

  private getUserId(req: AuthenticatedRequest) {
    const userId =
      req.user?.id ??
      req.user?.userId ??
      req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng đăng nhập.',
      );
    }

    return userId;
  }
}
