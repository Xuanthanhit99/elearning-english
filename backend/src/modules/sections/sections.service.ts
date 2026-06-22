import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class SectionsService {
  constructor(private prismaService: PrismaService) {}

  async create(courseId: string, user: any, dto: CreateSectionDto) {
    const course = await this.prismaService.course.findUnique({
      where: {
        id: courseId,
      },
    });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new NotFoundException('Bạn không có quyền thêm chương');
    }

    return this.prismaService.section.create({
      data: {
        courseId,
        title: dto.title,
        order: dto.order || 0,
      },
    });
  }

  async update(id: string, user: any, dto: UpdateSectionDto) {
    console.log('id', id);

    const section = await this.prismaService.section.findUnique({
      where: {
        id,
      },
      include: {
        course: true,
      },
    });

    console.log('section', section);

    if (!section) {
      throw new NotFoundException('Không tìm thấy chương');
    }

    if (user.role !== UserRole.ADMIN && section.course.teacherId !== user.id) {
      throw new NotFoundException('Bạn không có quyền thêm chương');
    }

    return this.prismaService.section.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, user: any) {
    const section = await this.prismaService.section.findUnique({
      where: {
        id,
      },
      include: {
        course: true,
      },
    });

    if (!section) {
      throw new NotFoundException('Không tìm thấy chương');
    }

    if (user.role !== UserRole.ADMIN && section.course.teacherId !== user.id) {
      throw new NotFoundException('Bạn không có quyền thêm chương');
    }

    await this.prismaService.section.delete({
      where: { id },
    });

    return {
      message: 'Xóa chương thành công',
    };
  }
}
