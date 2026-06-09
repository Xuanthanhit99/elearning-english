import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UserRole } from '@prisma/client';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private prismaService: PrismaService) {}

  async create(sectionId: string, user: any, dto: CreateLessonDto) {
    const section = await this.prismaService.section.findUnique({
      where: { id: sectionId },
      include: {
        course: true,
      },
    });

    if (!section) {
      throw new NotFoundException('Không tìm thấy chương');
    }

    if (user.role !== UserRole.ADMIN && section.course.teacherId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền thêm bài học');
    }

    return this.prismaService.lesson.create({
      data: {
        sectionId,
        title: dto.title,
        content: dto.title,
        videoUrl: dto.videoUrl,
        duration: dto.duration,
        order: dto.order || 0,
        isPreview: dto.isPreview || false,
      },
    });
  }

  async update(id: string, user: any, dto: UpdateLessonDto) {
    const lesson = await this.prismaService.lesson.findUnique({
      where: { id },
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }

    if (
      user.role !== UserRole.ADMIN &&
      lesson.section.course.teacherId !== user.id
    ) {
      throw new ForbiddenException('Bạn không có quyền sửa bài học này');
    }

    return this.prismaService.lesson.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, user: any) {
    const lesson = await this.prismaService.lesson.findUnique({
      where: { id },
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }

    if (
      user.role !== UserRole.ADMIN &&
      lesson.section.course.teacherId !== user.id
    ) {
      throw new ForbiddenException('Bạn không có quyền sửa bài học này');
    }

    await this.prismaService.lesson.delete({
      where: { id },
    });

    return {
      message: 'Xóa bài học thành công',
    };
  }
}
