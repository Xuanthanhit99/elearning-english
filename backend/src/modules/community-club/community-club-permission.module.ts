import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommunityClubPermissionController } from './community-club-permission.controller';
import { CommunityClubPermissionService } from './community-club-permission.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [PrismaModule, NotificationsModule, SettingsModule],
  controllers: [CommunityClubPermissionController],
  providers: [CommunityClubPermissionService],
  exports: [CommunityClubPermissionService],
})
export class CommunityClubPermissionModule {}
