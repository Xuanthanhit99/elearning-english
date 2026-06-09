import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CoursesService } from './courses.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateCourseDto } from './dto/create-course.dto';

@Controller('courses')
export class CoursesController {
  constructor(private coursesService: CoursesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  create(@Req() req: any, @Body() dto: CreateCourseDto) {
    return this.coursesService.create(req.user.id, dto);
  }

  @Get('my-courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  findMyCourses(@Req() req: any) {
    return this.coursesService.findMyCourses(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async get(@Param('id') id: string, @Req() req: any) {
    const a = await this.coursesService.findOne(id, req.user);
    console.log("first", a);
    return this.coursesService.findOne(id, req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: CreateCourseDto,
  ) {
    return this.coursesService.update(id, req.user, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  delete(@Param('id') id: string, @Req() req: any) {
    return this.coursesService.delete(id, req.user);
  }

  @Get('public/list')
  findPublicCourses() {
    return this.coursesService.findPublicCourses();
  }

  @Get('public/:slug')
  findPublicCourseDetail(@Param('slug') slug: string) {
    return this.coursesService.findPublicCourseDetail(slug);
  }

  @Patch(':id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  submitCourse(@Param('id') id: string, @Req() req: any) {
    return this.coursesService.submitCourse(id, req.user);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  approveCourse(@Param('id') id: string) {
    return this.coursesService.approveCourse(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  rejectCourse(@Param('id') id: string) {
    return this.coursesService.rejectCourse(id);
  }

  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findPendingCourses() {
    return this.coursesService.findPendingCourses();
  }
}
