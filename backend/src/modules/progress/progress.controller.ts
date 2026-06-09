import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ProgressService } from './progress.service';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('lessons/:lessonId/complete')
  completeLesson(@Param('lessonId') lessonId: string, @Req() req: any) {
    return this.progressService.completeLesson(req.user.id, lessonId);
  }

  @Get('courses/:courseId')
  getCourseProgress(@Param('courseId') courseId: string, @Req() req: any) {
    return this.progressService.getCourseProgress(req.user.id, courseId);
  }
}
