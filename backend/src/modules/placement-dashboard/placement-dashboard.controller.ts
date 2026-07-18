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
import { RetakePlacementDto } from './dto/retake-placement.dto';
import { PlacementDashboardService } from './placement-dashboard.service';

type AuthenticatedRequest = Request & {
  user?: { id: string };
};

@Controller('placement')
@UseGuards(JwtAuthGuard)
export class PlacementDashboardController {
  constructor(private readonly service: PlacementDashboardService) {}

  @Get('dashboard')
  async getDashboard(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.service.getDashboard(this.getUserId(req)),
    };
  }

  @Post('retake')
  async retake(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RetakePlacementDto,
  ) {
    return {
      success: true,
      message: 'Đã tạo phiên Placement Test mới.',
      data: await this.service.retake(this.getUserId(req), dto.force ?? false),
    };
  }

  @Get('history')
  async history(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.service.getHistory(this.getUserId(req)),
    };
  }

  @Get('tests/:testId/compare')
  async compare(
    @Req() req: AuthenticatedRequest,
    @Param('testId') testId: string,
  ) {
    return {
      success: true,
      data: await this.service.compare(this.getUserId(req), testId),
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
