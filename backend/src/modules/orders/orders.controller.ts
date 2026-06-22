import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post('courses/:courseId')
  createOrder(
    @Param('courseId') courseId: string,
    @Req() req: any,
    @Body('couponCode') couponCode?: string,
  ) {
    return this.ordersService.createOrder(req.user.id, courseId, couponCode);
  }

  @Get('/my')
  myOrders(@Req() req: any) {
    this.ordersService.myOrders(req.user.id);
  }
}
