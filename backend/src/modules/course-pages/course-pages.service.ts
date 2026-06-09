import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateCoursePageDto } from './dto/update-course-page.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class CoursePagesService {
  constructor(private prismaService: PrismaService) {}

  async getPage(courseId: string) {
    const page = await this.prismaService.coursePage.findUnique({
      where: { courseId },
    });

    if (!page) {
      return {
        courseId,
        blocks: [],
      };
    }

    return page;
  }

  async updatePage(courseId: string, user: any, dto: UpdateCoursePageDto) {
    const course = await this.prismaService.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền sửa trang này');
    }

    return this.prismaService.coursePage.upsert({
      where: { courseId },
      update: {
        blocks: dto.blocks,
      },
      create: {
        courseId,
        blocks: dto.blocks,
      },
    });
  }
}
