import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { LearningSkill } from '@prisma/client';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ProgressService } from './progress.service';
import { ProgressHistoryQueryDto } from './dto/progress-query.dto';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  getProgress(@Req() req: AuthenticatedRequest) {
    return this.progressService.getProgressOverview(req.user.id);
  }

  @Get('skills')
  getSkills(@Req() req: AuthenticatedRequest) {
    return this.progressService.getSkillProgress(req.user.id);
  }

  @Get('skills/:skill')
  getSkill(
    @Param('skill') skill: LearningSkill,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.progressService.getSkillProgress(req.user.id, skill);
  }

  @Get('in-progress')
  getInProgress(@Req() req: AuthenticatedRequest) {
    return this.progressService.getInProgressItems(req.user.id);
  }

  @Get('history')
  getHistory(
    @Req() req: AuthenticatedRequest,
    @Query() query: ProgressHistoryQueryDto,
  ) {
    return this.progressService.getUnifiedHistory(req.user.id, query);
  }

  @Get('activities/:activityId')
  getActivityDetail(
    @Req() req: AuthenticatedRequest,
    @Param('activityId') activityId: string,
  ) {
    return this.progressService.getActivityDetail(req.user.id, activityId);
  }

  @Post('lessons/:lessonId/complete')
  completeLesson(
    @Param('lessonId') lessonId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.progressService.completeLesson(req.user.id, lessonId);
  }

  @Get('courses/:courseId')
  getCourseProgress(
    @Param('courseId') courseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.progressService.getCourseProgress(req.user.id, courseId);
  }
}
