import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, WithdrawStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';

@Injectable()
export class WalletService {
  constructor(private prismaService: PrismaService) {}

  private platformFeeRate = 0.2;

  async getTeacherWallet(teacherId: string) {
    const orders = await this.prismaService.order.findMany({
      where: {
        status: OrderStatus.PAID,
        course: {
          teacherId,
        },
      },
    });

    const grossRevenue = orders.reduce((sum, order) => sum + order.amount, 0);

    const platformFee = Math.round(grossRevenue * this.platformFeeRate);

    const teacherRevenue = grossRevenue - platformFee;

    const withdraws = await this.prismaService.withdrawRequest.findMany({
      where: {
        teacherId,
        status: {
          in: [
            WithdrawStatus.APPROVED,
            WithdrawStatus.PAID,
            WithdrawStatus.PENDING,
          ],
        },
      },
    });

    const pendingWithdraw = withdraws
      .filter((x) => x.status === WithdrawStatus.PENDING)
      .reduce((sum, x) => sum + x.amount, 0);

    const paidWithdraw = withdraws
      .filter((x) => x.status === WithdrawStatus.PAID)
      .reduce((sum, x) => sum + x.amount, 0);

    const availableBalance = teacherRevenue - pendingWithdraw - paidWithdraw;

    return {
      grossRevenue,
      platformFee,
      teacherRevenue,
      pendingWithdraw,
      paidWithdraw,
      availableBalance,
    };
  }

  async createWithdrawRequest(teacherId: string, dto: CreateWithdrawDto) {
    const wallet = await this.getTeacherWallet(teacherId);

    if (dto.amount > wallet.availableBalance) {
      throw new BadRequestException('Số tiền rút vượt quá số dư khả dụng');
    }

    this.prismaService.withdrawRequest.create({
      data: {
        teacherId,
        amount: dto.amount,
        note: dto.note,
        status: WithdrawStatus.PENDING,
      },
    });
  }

  async getMyWithdraws(teacherId: string) {
    return this.prismaService.withdrawRequest.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllWithdraws() {
    return this.prismaService.withdrawRequest.findMany({
      include: {
        teacher: {
          select: {
            id: true,
            fullname: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateWithdrawStatus(id: string, status: WithdrawStatus) {
    const withdraw = await this.prismaService.withdrawRequest.findUnique({
      where: { id },
    });

    if (!withdraw) {
      throw new NotFoundException('Không tìm thấy yêu cầu rút tiền');
    }

    return this.prismaService.withdrawRequest.update({
      where: { id },
      data: { status },
    });
  }
}
