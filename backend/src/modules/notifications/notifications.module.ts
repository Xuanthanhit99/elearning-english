import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationCookieAuthService } from './notification-cookie-auth.service';
import { NotificationsController } from './notifications.controller';
import { NotificationEventListener } from './notification-event.listener';
import { NotificationEventPublisher } from './notification-event-publisher';
import { NotificationGateway } from './notification.gateway';
import { NotificationPreferenceResolver } from './preferences/notification-preference.resolver';
import { NotificationActionUrlBuilder } from './templates/notification-action-url.builder';
import { NotificationTemplateMapper } from './templates/notification-template.mapper';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationScheduler } from './notifications.scheduler';
import { NotificationsService } from './notifications.service';
import { NotificationsSettingsListener } from './settings-updated.listener';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationCookieAuthService,
    NotificationGateway,
    NotificationEventPublisher,
    NotificationEventListener,
    NotificationPreferenceResolver,
    NotificationActionUrlBuilder,
    NotificationTemplateMapper,
    NotificationsProcessor,
    NotificationScheduler,
    NotificationsSettingsListener,
  ],
  exports: [NotificationsService, NotificationEventPublisher],
})
export class NotificationsModule {}
