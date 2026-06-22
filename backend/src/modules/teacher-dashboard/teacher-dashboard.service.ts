import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TeacherDashboardService {
  constructor(private prismaService: PrismaService) {}

  async getRevenue(teacherId: string) {
    const orders = await this.prismaService.order.findMany({
      where: {
        status: OrderStatus.PAID,
        course: {
          teacherId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalRevenue = orders.reduce((sum, order) => {
      return sum + order.amount;
    }, 0);

    const totalOrders = orders.length;

    const uniqueStudents = new Set(orders.map((order) => order.userId));

    const totalStudents = uniqueStudents.size;

    const courseRevenueMap: Record<string, any> = {};

    for (const order of orders) {
      const courseId = order.id;

      if (!courseRevenueMap[courseId]) {
        courseRevenueMap[courseId] = {
          courseId,
          title: order.course.title,
          revenue: 0,
          orders: 0,
        };
      }

      courseRevenueMap[courseId].revenue += order.amount;
      courseRevenueMap[courseId].order += 1;
    }
    return {
      totalRevenue,
      totalOrders,
      totalStudents,
      courseRevenue: Object.values(courseRevenueMap),
      orders,
    };
  }
}
