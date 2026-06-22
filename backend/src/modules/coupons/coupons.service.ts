import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import { DiscountType } from '@prisma/client';
import { CreateCouponDto } from './dto/create-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prismaService: PrismaService) {}

  async create(dto: CreateCouponDto) {
    return this.prismaService.coupon.create({
      data: {
        ...dto,
        code: dto.code?.toUpperCase(),
      },
    });
  }

  async findAll() {
    return this.prismaService.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async validateCoupon(code: string, coursePrice: number) {
    const coupon = await this.prismaService.coupon.findUnique({
      where: {
        code: code.toUpperCase(),
      },
    });

    if (!coupon) {
      throw new NotFoundException('Mã giảm giá không tồn tại');
    }

    if (!coupon.isActive) {
      throw new BadRequestException('Mã giảm giá đã bị tắt');
    }

    if (coupon.expiredAt && coupon.expiredAt < new Date()) {
      throw new BadRequestException('Mã giảm giá đã hết hạn');
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }

    let discountAmount = 0;

    if (coupon.discountType === DiscountType.PERCENT) {
      discountAmount = Math.round((coursePrice * coupon.discountValue) / 100);
    } else {
      discountAmount = coupon.discountValue;
    }

    if (discountAmount > coursePrice) {
      discountAmount = coursePrice;
    }

    return {
      coupon,
      discountAmount,
      finalAmount: coursePrice - discountAmount,
    };
  }
}
