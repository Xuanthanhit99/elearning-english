import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CoursePagesService } from './course-pages.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { UpdateCoursePageDto } from './dto/update-course-page.dto';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('courses/:courseId/page')
export class CoursePagesController {
  constructor(private coursePageService: CoursePagesService) {}

  @Get()
  async getPage(@Param('courseId') courseId: string) {
    return this.coursePageService.getPage(courseId);
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async updatePage(
    @Param('courseId') courseId: string,
    @Req() req: any,
    @Body() dto: UpdateCoursePageDto,
  ) {
    return this.coursePageService.updatePage(courseId, req.user, dto);
  }
}
