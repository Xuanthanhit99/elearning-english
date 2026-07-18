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
import { RetakePlacementSessionDto } from './dto/retake-placement-session.dto';
import { StartPlacementSessionDto } from './dto/start-placement-session.dto';
import { PlacementSessionService } from './placement-session.service';

type AuthenticatedRequest = Request & {
  user?: { id?: string; userId?: string; sub?: string };
};

@Controller('placement/session')
@UseGuards(JwtAuthGuard)
export class PlacementSessionController {
  constructor(private readonly sessionService: PlacementSessionService) {}

  @Post('start')
  async start(
    @Req() req: AuthenticatedRequest,
    @Body() dto: StartPlacementSessionDto,
  ) {
    return {
      success: true,
      data: await this.sessionService.startOrResume(this.getUserId(req), dto),
    };
  }

  @Post('retake')
  async retake(
    @Req() req: AuthenticatedRequest,
    @Body() dto: RetakePlacementSessionDto,
  ) {
    return {
      success: true,
      data: await this.sessionService.startRetake(this.getUserId(req), dto),
    };
  }

  @Get('active')
  async active(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.sessionService.getActiveSession(this.getUserId(req)),
    };
  }

  @Post(':testId/abandon')
  async abandon(
    @Req() req: AuthenticatedRequest,
    @Param('testId') testId: string,
  ) {
    return {
      success: true,
      data: await this.sessionService.abandonSession(
        this.getUserId(req),
        testId,
      ),
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
