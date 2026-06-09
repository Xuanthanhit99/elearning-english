import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CourseLandingService } from './course-landing.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateCourseLandingDto } from './dto/create-course-landing.dto';

@Controller('courses/:courseId/landing')
export class CourseLandingController {
  constructor(private readonly courseLandingService: CourseLandingService) {}

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createOrUpdate(
    @Param('courseId') courseId: string,
    @Req() req: any,
    @Body() dto: CreateCourseLandingDto,
  ) {
    return this.courseLandingService.createOrUpdate(courseId, req.user, dto);
  }

  @Get()
  getLanding(@Param('courseId') courseId: string) {
    return this.courseLandingService.findByCourse(courseId);
  }
}
