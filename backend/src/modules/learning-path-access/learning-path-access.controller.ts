import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LearningPathAccessService } from './learning-path-access.service';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
  };
};

@Controller('learning-path')
@UseGuards(JwtAuthGuard)
export class LearningPathAccessController {
  constructor(
    private readonly accessService: LearningPathAccessService,
  ) {}

  @Get('access')
  async getAccess(
    @Req() req: AuthenticatedRequest,
  ) {
    return {
      success: true,
      data: await this.accessService.resolve(
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
