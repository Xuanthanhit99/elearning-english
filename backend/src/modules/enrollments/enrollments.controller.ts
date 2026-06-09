import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { EnrollmentsService } from './enrollments.service';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post('free/:courseId')
  enrollFreeCourse(@Param('courseId') courseId: string, @Req() req: any) {
    return this.enrollmentsService.enrollFreeCourse(req.user.id, courseId);
  }

  @Get('my-courses')
  myCourses(@Req() req: any) {
    return this.enrollmentsService.myCourses(req.user.id);
  }

  @Get('check/:courseId')
  checkEnrollment(@Param('courseId') courseId: string, @Req() req: any) {
    return this.enrollmentsService.checkEnrollment(req.user.id, courseId);
  }
}