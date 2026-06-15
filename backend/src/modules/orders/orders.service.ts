import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prismaService: PrismaService) {}

  async createOrder(userId: string, courseId: string) {
    const course = await this.prismaService.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    if (course.status !== CourseStatus.APPROVED) {
      throw new BadRequestException('Khóa học chưa được duyệt');
    }

    const existedEnrollment = await this.prismaService.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existedEnrollment) {
      throw new BadRequestException('Bạn đã sở hữu khóa học này');
    }

    if (course.price === 0) {
      const enrollment = await this.prismaService.enrollment.create({
        data: {
          userId,
          courseId,
        },
      });

      return {
        type: 'FREE',
        message: 'Đăng ký khóa học miễn phí thành công',
        enrollment,
      };
    }

    const order = await this.prismaService.order.create({
      data: {
        userId,
        courseId,
        amount: course.price,
        status: OrderStatus.PENDING,
      },
    });

    return {
      type: 'PAID',
      message: 'Tạo đơn hàng thành công',
      order,
    };
  }

  async myOrders(userId: string) {
    return this.prismaService.order.findMany({
      where: {
        userId,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
