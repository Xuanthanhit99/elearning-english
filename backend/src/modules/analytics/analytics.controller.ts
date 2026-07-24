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
import { SkillRadarService } from './skill-radar.service';
import { WeaknessDetectionService } from './weakness-detection.service';
import { AiCoachService } from './ai-coach.service';
import {
  AnalyticsQueryDto,
  AnalyticsRange,
  ReportQueryDto,
  TimelineQueryDto,
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
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly skillRadarService: SkillRadarService,
    private readonly weaknessDetectionService: WeaknessDetectionService,
    private readonly aiCoachService: AiCoachService,
  ) {}

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

  @Get('analytics/metrics')
  async metrics(
    @Req() req: AuthenticatedRequest,
    @Query() query: AnalyticsQueryDto,
  ) {
    return {
      success: true,
      data: await this.analyticsService.getMetrics(this.getUserId(req), query),
    };
  }

  @Get('analytics/timeline')
  async timeline(
    @Req() req: AuthenticatedRequest,
    @Query() query: TimelineQueryDto,
  ) {
    return {
      success: true,
      data: await this.analyticsService.getTimeline(this.getUserId(req), query),
    };
  }

  @Get('analytics/radar')
  async radar(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.skillRadarService.getRadar(this.getUserId(req)),
    };
  }

  @Get('analytics/weaknesses')
  async weaknesses(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      data: await this.weaknessDetectionService.getWeaknesses(
        this.getUserId(req),
      ),
    };
  }

  @Get('analytics/coach')
  async coach(
    @Req() req: AuthenticatedRequest,
    @Query('refresh') refresh?: string,
  ) {
    return {
      success: true,
      data: await this.aiCoachService.getCoachAdvice(this.getUserId(req), {
        forceRefresh: refresh === 'true' || refresh === '1',
      }),
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
