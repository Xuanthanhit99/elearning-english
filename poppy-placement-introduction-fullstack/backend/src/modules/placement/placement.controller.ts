import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PlacementService } from './placement.service';
import { StartPlacementTestDto } from './dto/start-placement-test.dto';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
};

@Controller('placement')
@UseGuards(JwtAuthGuard)
export class PlacementController {
  constructor(private readonly placementService: PlacementService) {}

  @Get('introduction')
  async getIntroduction(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);

    return {
      success: true,
      data: await this.placementService.getIntroduction(userId),
    };
  }

  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startPlacementTest(
    @Req() req: AuthenticatedRequest,
    @Body() dto: StartPlacementTestDto,
  ) {
    const userId = this.getUserId(req);

    return {
      success: true,
      message: 'Bài kiểm tra đã sẵn sàng.',
      data: await this.placementService.startOrResumeTest(userId, dto.mode),
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
