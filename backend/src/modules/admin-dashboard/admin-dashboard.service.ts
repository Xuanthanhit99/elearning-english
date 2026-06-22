import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { UserRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private prismaService: PrismaService) {}

  async getRevenue() {
    const orders = await this.prismaService.order.findMany({
      where: { status: OrderStatus.PAID },
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
            teacher: {
              select: {
                id: true,
                fullname: true,
                email: true,
              },
            },
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

    const totalTeachers = await this.prismaService.user.count({
      where: { role: UserRole.TEACHER },
    });

    const platformFeeRate = 0.2;

    const platformFee = Math.round(platformFeeRate * totalRevenue);

    const teacherRevenue = totalRevenue - platformFee;

    const teacherRevenueMap: Record<string, any> = {};

    for (const order of orders) {
      const teacher = order.course.teacher;

      if (!teacherRevenueMap[teacher.id]) {
        teacherRevenueMap[teacher.id] = {
          teacherId: teacher.id,
          teacherName: teacher.fullname,
          teacherEmail: teacher.email,
          totalRevenue: 0,
          platformFee: 0,
          teacherRevenue: 0,
          orders: 0,
        };
      }

      const fee = Math.round(order.amount * platformFeeRate);
      const net = order.amount - fee;

      teacherRevenueMap[teacher.id].totalRevenue += order.amount;
      teacherRevenueMap[teacher.id].platformFee += fee;
      teacherRevenueMap[teacher.id].teacherRevenue += net;
      teacherRevenueMap[teacher.id].orders += 1;
    }

    return {
      totalRevenue,
      totalOrders,
      totalStudents,
      totalTeachers,
      platformFee,
      teacherRevenue,
      platformFeeRate,
      teacherRevenueSummary: Object.values(teacherRevenueMap),
      orders,
    };
  }
}
