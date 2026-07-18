import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationsService) {}

  @Get()
  findMyNotifications(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationService.findMyNotifications(req.user.id, {
      page: Number(page || 1),
      limit: Number(limit || 20),
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  async unreadCount(@Req() req: any) {
    return {
      unreadCount: await this.notificationService.getUnreadCount(req.user.id),
    };
  }

  @Post('read')
  markAsRead(@Body('id') id: string, @Req() req: any) {
    return this.notificationService.markAsRead(req.user.id, id);
  }

  @Post('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.notificationService.delete(req.user.id, id);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @Req() req: any) {
    return this.notificationService.archive(req.user.id, id);
  }

  @Patch(':id/read')
  markAsReadLegacy(@Param('id') id: string, @Req() req: any) {
    return this.notificationService.markAsRead(req.user.id, id);
  }

  @Patch('read-all')
  markAllAsReadLegacy(@Req() req: any) {
    return this.notificationService.markAllAsRead(req.user.id);
  }
}
