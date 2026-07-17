import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationScheduler } from './notifications.scheduler';
import { NotificationsService } from './notifications.service';
import { NotificationsSettingsListener } from './settings-updated.listener';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE })],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsProcessor,
    NotificationScheduler,
    NotificationsSettingsListener,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
