import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('orders/:orderId/vnpay')
  @UseGuards(JwtAuthGuard)
  createVnpayUrl(@Param('orderId') orderId: string, @Req() req: Request) {
    const ipAddr =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      '127.0.0.1';

    return this.paymentsService.createVnpayUrl(orderId, ipAddr);
  }

  @Get('vnpay-return')
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentsService.handleVnpayReturn(query);

    if (result.success) {
      return res.redirect(
        `${process.env.FRONTEND_PAYMENT_SUCCESS_URL}?orderId=${result.order.id}`,
      );
    }

    return res.redirect(
      `${process.env.FRONTEND_PAYMENT_FAILED_URL}?orderId=${result.order.id}`,
    );
  }
}
