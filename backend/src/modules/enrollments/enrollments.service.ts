import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private prismaService: PrismaService) {}

  async enrollFreeCourse(userId: string, courseId: string) {
    const course = await this.prismaService.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    if (course.status !== CourseStatus.APPROVED) {
      throw new BadRequestException('Khóa học chưa được duyệt');
    }

    if (course.price > 0) {
      throw new BadRequestException('Khóa học này cần thanh toán');
    }

    const existed = await this.prismaService.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existed) {
      throw new BadRequestException('Bạn đã sở hữu khóa học này');
    }

    return this.prismaService.enrollment.create({
      data: {
        userId,
        courseId,
      },
    });
  }

  async myCourses(userId: string) {
    return this.prismaService.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            teacher: {
              select: {
                id: true,
                fullname: true,
                avatar: true,
              },
            },
            sections: {
              orderBy: {
                order: 'asc',
              },
              include: {
                lessons: {
                  orderBy: {
                    order: 'asc',
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async checkEnrollment(userId: string, courseId: string) {
    const enrollment = await this.prismaService.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    return {
      enrolled: !!enrollment,
    };
  }
}
