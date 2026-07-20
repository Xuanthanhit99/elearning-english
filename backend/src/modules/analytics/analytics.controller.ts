import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { LearningSkill } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsQueryDto,
  AnalyticsRange,
  ReportQueryDto,
} from './dto/analytics-query.dto';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
  };
};

@Controller()
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('analytics/overview')
  async overview(
    @Req() req: AuthenticatedRequest,
    @Query() query: AnalyticsQueryDto,
  ) {
    return {
      success: true,
      data: await this.analyticsService.getOverview(this.getUserId(req), query),
    };
  }

  @Get('analytics/skills')
  async skills(
    @Req() req: AuthenticatedRequest,
    @Query() query: AnalyticsQueryDto,
  ) {
    return {
      success: true,
      data: await this.analyticsService.getSkills(this.getUserId(req), query),
    };
  }

  @Get('analytics/skills/:skill')
  async skillDetail(
    @Req() req: AuthenticatedRequest,
    @Param('skill') skill: LearningSkill,
    @Query() query: AnalyticsQueryDto,
  ) {
    return {
      success: true,
      data: await this.analyticsService.getSkillDetail(this.getUserId(req), {
        ...query,
        skill,
      }),
    };
  }

  @Get('analytics/activity')
  async activity(
    @Req() req: AuthenticatedRequest,
    @Query() query: AnalyticsQueryDto,
  ) {
    return {
      success: true,
      data: await this.analyticsService.getActivity(this.getUserId(req), query),
    };
  }

  @Get('reports/weekly')
  async weeklyReport(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.analyticsService.getReport(this.getUserId(req), {
        range: AnalyticsRange.SEVEN_DAYS,
      }),
    };
  }

  @Get('reports/monthly')
  async monthlyReport(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.analyticsService.getReport(this.getUserId(req), {
        range: AnalyticsRange.THIRTY_DAYS,
      }),
    };
  }

  @Get('reports/range')
  async rangeReport(
    @Req() req: AuthenticatedRequest,
    @Query() query: ReportQueryDto,
  ) {
    return {
      success: true,
      data: await this.analyticsService.getReport(this.getUserId(req), query),
    };
  }

  private getUserId(req: AuthenticatedRequest) {
    const id = req.user?.id ?? req.user?.userId ?? req.user?.sub;
    if (!id) {
      throw new UnauthorizedException('Khong xac dinh duoc nguoi dung.');
    }
    return id;
  }
}
