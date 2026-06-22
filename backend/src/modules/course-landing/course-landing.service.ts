import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCourseLandingDto } from './dto/create-course-landing.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class CourseLandingService {
  constructor(private prismaService: PrismaService) {}

  async createOrUpdate(
    courseId: string,
    user: any,
    dto: CreateCourseLandingDto,
  ) {
    const course = await this.prismaService.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền sửa landing page');
    }

    return this.prismaService.courseLanding.upsert({
      where: { courseId },
      update: dto,
      create: {
        courseId,
        ...dto,
      },
    });
  }

  async findByCourse(courseId: string) {
    return this.prismaService.courseLanding.findUnique({
      where: { courseId },
    });
  }
}