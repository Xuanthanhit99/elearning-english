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
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PlacementService } from './placement.service';
import { SelectManualLevelDto } from './dto/select-manual-level.dto';
import { Request } from 'express';
import { StartPlacementTestDto } from './dto/start-placement-test.dto';
import { PlacementRetakeService } from '../placement-dashboard/placement-retake.service';
import { RetakePlacementDto } from '../placement-dashboard/dto/retake-placement.dto';

type AuthenticatedUser = {
  id: string;
  email: string;
  role: string;
};

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Controller('placement')
@UseGuards(JwtAuthGuard)
export class PlacementController {
  constructor(
    private placementService: PlacementService,
    private retakeService: PlacementRetakeService,
  ) {}

  @Get('home')
  async getHome(@Req() req: AuthenticatedRequest) {
    const userId = this.getUserId(req);

    return {
      success: true,
      data: await this.placementService.getPlacementHome(userId),
    };
  }

  @Post('retake')
  async retake(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RetakePlacementDto,
  ) {
    return {
      success: true,
      message: 'Đã chuẩn bị bài kiểm tra mới.',
      data: await this.retakeService.retake(
        this.getUserId(req),
        dto.force ?? false,
      ),
    };
  }
  @Post('manual')
  @HttpCode(HttpStatus.OK)
  async selectManualLevel(
    @Req() req: AuthenticatedRequest,
    @Body() dto: SelectManualLevelDto,
  ) {
    const userId = this.getUserId(req);

    return {
      success: true,
      message: 'Đã tạo lộ trình theo trình độ người dùng lựa chọn.',
      data: await this.placementService.selectManualLevel(userId, dto.level),
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
      data: await this.placementService.startNewRetake(userId, dto.mode),
    };
  }

  @Get('retake/status')
  async getRetakeStatus(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.retakeService.getRetakeStatus(this.getUserId(req)),
    };
  }
}
