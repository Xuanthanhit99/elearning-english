import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
  };
};

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.dashboardService.getDashboard(this.getUserId(req)),
    };
  }

  private getUserId(req: AuthenticatedRequest) {
    const id = req.user?.id ?? req.user?.userId ?? req.user?.sub;

    if (!id) {
      throw new UnauthorizedException('Không xác định được người dùng.');
    }

    return id;
  }
}
