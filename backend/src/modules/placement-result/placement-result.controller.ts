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
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PlacementResultService } from './placement-result.service';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

@Controller('placement/tests')
@UseGuards(JwtAuthGuard)
export class PlacementResultController {
  constructor(
    private readonly placementResultService: PlacementResultService,
  ) {}

  @Post(':testId/result/generate')
  async generate(
    @Req() req: AuthenticatedRequest,
    @Param('testId') testId: string,
  ) {
    return {
      success: true,
      data: await this.placementResultService.ensureGenerated(
        this.getUserId(req),
        testId,
      ),
    };
  }

  @Get(':testId/result')
  async getResult(
    @Req() req: AuthenticatedRequest,
    @Param('testId') testId: string,
  ) {
    return {
      success: true,
      data: await this.placementResultService.getResult(
        this.getUserId(req),
        testId,
      ),
    };
  }

  private getUserId(req: AuthenticatedRequest) {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng đăng nhập.',
      );
    }

    return userId;
  }
}
