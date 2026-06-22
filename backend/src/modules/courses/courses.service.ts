import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { createSlug } from 'src/common/utils/slug.util';
import { CourseStatus, UserRole } from '@prisma/client';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(teacherId: string, dto: CreateCourseDto) {
    const slug = `${createSlug(dto.title)}-${Date.now()}`;

    return this.prisma.course.create({
      data: {
        teacherId,
        title: dto.title,
        slug,
        description: dto.description,
        thumbnail: dto.thumbnail,
        level: dto.level as string,
        price: dto.price || 0,
        status: CourseStatus.DRAFT,
      },
    });
  }

  async findMyCourses(userId: string) {
    return await this.prisma.course.findMany({
      where: {
        teacherId: userId,
      },
      include: {
        sections: {
          include: {
            lessons: true,
          },
        },
      },
      orderBy: {
        createAt: 'desc',
      },
    });
  }

  async findOne(id: string, user: any) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                quizzes: true,
              },
            },
          },
        },
      },
    });

    console.log('course--->1', course);

    if (!course) {
      console.log('course---->2');
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    console.log('user', user);

    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      console.log('course---->3');
      throw new NotFoundException('Bạn không có quyền truy cập khóa học này');
    }

    console.log('course---->4');
    return course;
  }

  async update(id: string, dto: UpdateCourseDto, user: any) {
    const course = await this.prisma.course.findUnique({ where: { id } });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    if (user.role !== UserRole.ADMIN || course.teacherId !== user.id) {
      throw new NotFoundException('Bạn không có quyền sửa khóa học này');
    }

    return await this.prisma.course.update({
      where: { id },
      data: {
        ...dto,
        slug: dto.title
          ? `${createSlug(dto.title)}-${Date.now()}`
          : course.slug,
      },
    });
  }

  async delete(id: string, user: any) {
    const course = await this.prisma.course.findUnique({ where: { id } });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    if (user.role !== UserRole.ADMIN || course.teacherId !== user.id) {
      throw new NotFoundException('Bạn không có quyền sửa khóa học này');
    }

    await this.prisma.course.delete({
      where: { id },
    });

    return {
      message: 'Xóa khóa học thành công',
    };
  }

  async findPublicCourses() {
    return this.prisma.course.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnail: true,
        level: true,
        price: true,
        teacher: {
          select: {
            id: true,
            fullname: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createAt: 'desc',
      },
    });
  }

  async findPublicCourseDetail(slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        page: true,
        landing: true,
        teacher: {
          select: {
            id: true,
            fullname: true,
            avatar: true,
          },
        },
        sections: {
          orderBy: {
            order: 'desc',
          },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                duration: true,
                order: true,
                isPreview: true,
              },
            },
          },
        },
      },
    });

    if (!course || course.status !== 'APPROVED') {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    return course;
  }

  async submitCourse(id: string, user: any) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            lessons: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    if (user.role !== UserRole.ADMIN && course.teacherId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền gửi duyệt khóa học này');
    }

    if (!course.sections.length) {
      throw new BadRequestException('Khóa học cần có ít nhất 1 chương');
    }

    const hasLesson = course.sections.some(
      (section) => section.lessons.length > 0,
    );
    if (!hasLesson) {
      throw new BadRequestException('Khóa học cần có ít nhất 1 bài học');
    }

    return this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.PENDING,
      },
    });
  }

  async approveCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    await this.prisma.notification.create({
      data: {
        userId: course.teacherId,
        title: 'Khóa học đã được duyệt',
        message: `Khóa học "${course.title}" đã được public.`,
      },
    });

    return this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.APPROVED,
      },
    });
  }

  async rejectCourse(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    return this.prisma.course.update({
      where: { id },
      data: {
        status: CourseStatus.REJECTED,
      },
    });
  }
  async findPendingCourses() {
    return await this.prisma.course.findMany({
      where: { status: CourseStatus.PENDING },
      include: {
        teacher: {
          select: {
            id: true,
            fullname: true,
            email: true,
            avatar: true,
          },
        },
        sections: {
          include: {
            lessons: true,
          },
        },
      },
      orderBy: {
        createAt: 'desc',
      },
    });
  }
}
