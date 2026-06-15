import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';
import * as qs from 'qs';
import * as dayjs from 'dayjs';

@Injectable()
export class PaymentsService {
  constructor(private prismaService: PrismaService) {}

  private sortObject(obj: Record<string, any>) {
    const sorted: Record<string, any> = {};

    Object.keys(obj)
      .sort()
      .forEach((key) => {
        sorted[key] = obj[key];
      });

    return sorted;
  }

  async createVnpayUrl(orderId: string, ipAddr = '127.0.0.1') {
    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
      include: {
        course: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Đơn hàng không ở trạng thái chờ thanh toán',
      );
    }

    const vnpParams: Record<string, any> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: process.env.VNP_TMNCODE,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: order.id,
      vnp_OrderInfo: `Thanh toan khoa hoc ${order.course.title}`,
      vnp_OrderType: 'other',
      vnp_Amount: order.amount * 100,
      vnp_ReturnUrl: process.env.VNP_RETURN_URL,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: dayjs().format('YYYYMMDDHHmmss'),
    };

    const sortedParams = this.sortObject(vnpParams);

    const signData = qs.stringify(sortedParams, {
      encode: false,
    });

    const secureHash = crypto
      .createHmac('sha512', process.env.VNP_HASH_SECRET as string)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    sortedParams.vnp_SecureHash = secureHash;

    const paymentUrl =
      process.env.VNP_URL +
      '?' +
      qs.stringify(sortedParams, {
        encode: false,
      });

    return {
      paymentUrl,
    };
  }

  async handleVnpayReturn(query: Record<string, any>) {
    const vnpParams = { ...query };

    const secureHash = vnpParams.vnp_SecureHash;

    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const sortedParams = this.sortObject(vnpParams);

    const signData = qs.stringify(sortedParams, {
      encode: false,
    });

    const checkHash = crypto
      .createHmac('sha512', process.env.VNP_HASH_SECRET as string)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    if (secureHash !== checkHash) {
      throw new BadRequestException('Sai chữ ký VNPay');
    }

    const orderId = query.vnp_TxnRef;
    const responseCode = query.vnp_ResponseCode;

    const order = await this.prismaService.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (responseCode === '00') {
      const updatedOrder = await this.prismaService.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
        },
      });

      await this.prismaService.enrollment.upsert({
        where: {
          userId_courseId: {
            userId: order.userId,
            courseId: order.courseId,
          },
        },
        update: {},
        create: {
          userId: order.userId,
          courseId: order.courseId,
        },
      });

      return {
        success: true,
        order: updatedOrder,
      };
    }

    const failedOrder = await this.prismaService.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.FAILED,
      },
    });

    return {
      success: false,
      order: failedOrder,
    };
  }
}
