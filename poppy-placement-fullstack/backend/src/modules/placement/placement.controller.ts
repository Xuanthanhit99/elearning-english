import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PlacementService } from './placement.service';
import { SelectManualLevelDto } from './dto/select-manual-level.dto';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
  };
};

@Controller('placement')
export class PlacementController {
  constructor(private readonly placementService: PlacementService) {}

  @Get('home')
  async getHome(@Req() req: AuthenticatedRequest) {
    const userId = this.resolveUserId(req);

    return {
      success: true,
      data: await this.placementService.getPlacementHome(userId),
    };
  }

  @Post('manual')
  @HttpCode(HttpStatus.OK)
  async selectManualLevel(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SelectManualLevelDto,
  ) {
    const userId = this.resolveUserId(req);

    return {
      success: true,
      message: 'Đã tạo lộ trình theo trình độ người dùng lựa chọn.',
      data: await this.placementService.selectManualLevel(userId, dto.level),
    };
  }

  private resolveUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.id ?? req.user?.userId ?? req.user?.sub;

    if (!userId) {
      throw new UnauthorizedException('Không xác định được người dùng đăng nhập.');
    }

    return userId;
  }
}
