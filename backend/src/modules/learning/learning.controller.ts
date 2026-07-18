import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LearningService } from './learning.service';

@Controller('learning')
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  @Get('lessons/:lessonId')
  getLessonDetail(@Param('lessonId') lessonId: string, @Req() req: any) {
    return this.learningService.getLessonDetail(req.user.id, lessonId);
  }
}
